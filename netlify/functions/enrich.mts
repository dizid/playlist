import type { Context, Config } from "@netlify/functions"
import { getDb } from './_shared/db'
import { validateSession, unauthorizedResponse, jsonResponse, errorResponse } from './_shared/auth'
import { lookupTrackMetadata } from './_shared/metadata'
import { searchYouTubeVideo, youtubeQuotaExceeded } from './_shared/youtube'

// Rate limit: 200ms between API requests
const RATE_LIMIT_MS = 200

// Max songs to process per request (avoid timeout)
const BATCH_SIZE = 25

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default async (req: Request, context: Context) => {
  // Validate session
  const session = await validateSession(req)
  if (!session) {
    return unauthorizedResponse()
  }

  const userId = session.user.id
  const sql = getDb()

  try {
    // POST /api/enrich - Enrich songs with genre/mood data AND YouTube links
    if (req.method === 'POST') {
      const body = await req.json()

      // Songs that still need tags or a YouTube video. Only 'pending' tags: songs
      // whose tags couldn't be found ('failed') or were set by hand ('manual')
      // are not picked again, so they can't block the queue or be overwritten.
      let songsToEnrich
      if (body.songIds && Array.isArray(body.songIds)) {
        songsToEnrich = await sql`
          SELECT id, youtube_id, youtube_status, title, artist, channel, genres, moods, enrichment_status
          FROM songs
          WHERE user_id = ${userId}
            AND id = ANY(${body.songIds}::uuid[])
            AND (enrichment_status = 'pending' OR youtube_status = 'pending')
          LIMIT ${BATCH_SIZE}
        `
      } else if (body.all === true) {
        songsToEnrich = await sql`
          SELECT id, youtube_id, youtube_status, title, artist, channel, genres, moods, enrichment_status
          FROM songs
          WHERE user_id = ${userId}
            AND (enrichment_status = 'pending' OR youtube_status = 'pending')
          ORDER BY created_at DESC, id
          LIMIT ${BATCH_SIZE}
        `
      } else {
        return errorResponse('Provide songIds array or all: true', 400)
      }

      let enriched = 0
      let failed = 0
      let youtubeLinked = 0
      let youtubePaused = false // YouTube quota used up: try again later
      const results: Array<{ id: string, status: string, genres?: string[], moods?: string[], youtubeId?: string }> = []

      // Synchronous functions are stopped after 10 s: stop early, the next call continues
      const deadline = Date.now() + 7000
      let processed = 0

      for (const song of songsToEnrich) {
        if (Date.now() > deadline) break
        processed++
        // "Artist - Topic" channels name the artist; a plain channel name is a weak guess
        const artistName = song.artist || (song.channel ? String(song.channel).replace(/ - Topic$/, '') : '')
        const hasTags = (Array.isArray(song.genres) && song.genres.length > 0) || (Array.isArray(song.moods) && song.moods.length > 0)
        const needsMetadata = song.enrichment_status === 'pending' && !hasTags
        const needsYouTube = song.youtube_status === 'pending' || String(song.youtube_id || '').startsWith('shz')

        // 1. Genres and moods from Last.fm tags
        let metadata = null
        if (needsMetadata && artistName) {
          metadata = await lookupTrackMetadata(artistName, song.title)
          await delay(RATE_LIMIT_MS)
        }
        const foundTags = !!metadata && (metadata.genres.length > 0 || metadata.moods.length > 0)

        // Tag status: found -> completed; looked up but nothing usable (or no
        // artist to look up) -> failed; already tagged or set by hand -> unchanged
        const newEnrichmentStatus = foundTags
          ? 'completed'
          : needsMetadata ? 'failed' : (hasTags && song.enrichment_status === 'pending' ? 'completed' : song.enrichment_status)

        await sql`
          UPDATE songs
          SET
            genres = CASE WHEN ${foundTags} THEN ${foundTags ? metadata.genres : []}::text[] ELSE genres END,
            moods = CASE WHEN ${foundTags} THEN ${foundTags ? metadata.moods : []}::text[] ELSE moods END,
            enrichment_status = ${newEnrichmentStatus},
            updated_at = NOW()
          WHERE id = ${song.id}::uuid AND user_id = ${userId}
        `

        // 2. A real YouTube video for songs that only have a stand-in id
        let linkedVideo: string | null = null
        if (needsYouTube && artistName && !youtubePaused) {
          const video = await searchYouTubeVideo(artistName, song.title)
          await delay(RATE_LIMIT_MS)
          if (video) {
            // The same video may already be in the library (e.g. imported from a
            // YouTube playlist): then keep this row as it is, instead of a
            // unique-key error that used to stop all enrichment for good
            const taken = await sql`
              SELECT 1 FROM songs WHERE user_id = ${userId} AND youtube_id = ${video.videoId} AND id <> ${song.id}::uuid LIMIT 1
            `
            if (taken.length === 0) {
              await sql`
                UPDATE songs
                SET youtube_id = ${video.videoId}, youtube_status = 'valid',
                    thumbnail = COALESCE(thumbnail, ${video.thumbnail}), updated_at = NOW()
                WHERE id = ${song.id}::uuid AND user_id = ${userId}
              `
              linkedVideo = video.videoId
              youtubeLinked++
            } else {
              await sql`UPDATE songs SET youtube_status = 'not_found', updated_at = NOW() WHERE id = ${song.id}::uuid AND user_id = ${userId}`
            }
          } else if (youtubeQuotaExceeded()) {
            // Quota or key problem: leave it 'pending' for a later run (was marked
            // 'not_found' forever)
            youtubePaused = true
          } else {
            await sql`UPDATE songs SET youtube_status = 'not_found', updated_at = NOW() WHERE id = ${song.id}::uuid AND user_id = ${userId}`
          }
        } else if (needsYouTube && !artistName && song.youtube_status === 'pending') {
          // Nothing to search with
          await sql`UPDATE songs SET youtube_status = 'not_found', updated_at = NOW() WHERE id = ${song.id}::uuid AND user_id = ${userId}`
        }

        if (foundTags) enriched++
        else if (needsMetadata) failed++
        results.push({
          id: song.id,
          status: newEnrichmentStatus,
          ...(foundTags ? { genres: metadata.genres, moods: metadata.moods } : {}),
          ...(linkedVideo ? { youtubeId: linkedVideo } : {})
        })
      }

      // Get remaining counts
      const remaining = await sql`
        SELECT
          COUNT(*) FILTER (WHERE enrichment_status = 'pending') as metadata_pending,
          COUNT(*) FILTER (WHERE youtube_status = 'pending') as youtube_pending
        FROM songs
        WHERE user_id = ${userId}
      `

      return jsonResponse({
        processed,
        enriched,
        youtubeLinked,
        failed,
        remaining: {
          metadata: parseInt(remaining[0]?.metadata_pending || '0'),
          youtube: parseInt(remaining[0]?.youtube_pending || '0')
        },
        youtubePaused,
        results
      })
    }

    // GET /api/enrich/status - Get enrichment status
    if (req.method === 'GET') {
      const status = await sql`
        SELECT
          enrichment_status,
          youtube_status,
          COUNT(*) as count
        FROM songs
        WHERE user_id = ${userId}
        GROUP BY enrichment_status, youtube_status
      `

      const counts = {
        metadata: { pending: 0, completed: 0, failed: 0, manual: 0 },
        youtube: { valid: 0, pending: 0, not_found: 0 }
      }

      for (const row of status) {
        const metaStatus = row.enrichment_status as string
        const ytStatus = row.youtube_status as string
        const count = parseInt(row.count)

        if (metaStatus && counts.metadata.hasOwnProperty(metaStatus)) {
          counts.metadata[metaStatus as keyof typeof counts.metadata] += count
        }
        if (ytStatus && counts.youtube.hasOwnProperty(ytStatus)) {
          counts.youtube[ytStatus as keyof typeof counts.youtube] += count
        }
      }

      return jsonResponse({
        ...counts,
        total: Object.values(counts.metadata).reduce((a, b) => a + b, 0)
      })
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error('Enrich API error:', error)
    return errorResponse('Internal server error', 500)
  }
}

export const config: Config = {
  path: ["/api/enrich", "/api/enrich/status"]
}
