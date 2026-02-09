import type { Context, Config } from "@netlify/functions"
import { getDb } from './_shared/db'
import { validateSession, unauthorizedResponse, jsonResponse, errorResponse } from './_shared/auth'
import { lookupTrackMetadata } from './_shared/metadata'
import { searchYouTubeVideo } from './_shared/youtube'

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

      // Get songs to enrich (metadata OR YouTube lookup needed)
      let songsToEnrich
      if (body.songIds && Array.isArray(body.songIds)) {
        // Specific songs
        songsToEnrich = await sql`
          SELECT id, youtube_id, youtube_status, title, artist, channel
          FROM songs
          WHERE user_id = ${userId}
            AND id = ANY(${body.songIds}::uuid[])
            AND (enrichment_status IN ('pending', 'failed') OR youtube_status = 'pending')
          LIMIT ${BATCH_SIZE}
        `
      } else if (body.all === true) {
        // All pending songs
        songsToEnrich = await sql`
          SELECT id, youtube_id, youtube_status, title, artist, channel
          FROM songs
          WHERE user_id = ${userId}
            AND (enrichment_status IN ('pending', 'failed') OR youtube_status = 'pending')
          ORDER BY created_at DESC
          LIMIT ${BATCH_SIZE}
        `
      } else {
        return errorResponse('Provide songIds array or all: true', 400)
      }

      let enriched = 0
      let failed = 0
      let youtubeLinked = 0
      const results: Array<{
        id: string,
        status: string,
        genres?: string[],
        moods?: string[],
        youtubeId?: string
      }> = []

      for (const song of songsToEnrich) {
        const artistName = song.artist || song.channel || ''
        const needsMetadata = !song.genres || song.genres.length === 0
        const needsYouTube = song.youtube_status === 'pending' || song.youtube_id?.startsWith('shz')

        let metadataResult = null
        let youtubeResult = null

        // 1. Lookup metadata from Last.fm (if needed)
        if (needsMetadata && artistName) {
          metadataResult = await lookupTrackMetadata(artistName, song.title)
          await delay(RATE_LIMIT_MS)
        }

        // 2. Search YouTube for video (if needed)
        if (needsYouTube && artistName) {
          youtubeResult = await searchYouTubeVideo(artistName, song.title)
          await delay(RATE_LIMIT_MS)
        }

        // Build update based on results
        const hasMetadata = metadataResult && (metadataResult.genres.length > 0 || metadataResult.moods.length > 0)
        const hasYouTube = youtubeResult !== null

        if (hasMetadata && hasYouTube) {
          // Both metadata and YouTube found
          await sql`
            UPDATE songs
            SET
              genres = ${metadataResult.genres}::text[],
              moods = ${metadataResult.moods}::text[],
              enrichment_status = 'completed',
              youtube_id = ${youtubeResult.videoId},
              youtube_status = 'valid',
              thumbnail = COALESCE(thumbnail, ${youtubeResult.thumbnail}),
              updated_at = NOW()
            WHERE id = ${song.id}::uuid AND user_id = ${userId}
          `
          enriched++
          youtubeLinked++
          results.push({
            id: song.id,
            status: 'completed',
            genres: metadataResult.genres,
            moods: metadataResult.moods,
            youtubeId: youtubeResult.videoId
          })
        } else if (hasMetadata) {
          // Only metadata found
          await sql`
            UPDATE songs
            SET
              genres = ${metadataResult.genres}::text[],
              moods = ${metadataResult.moods}::text[],
              enrichment_status = 'completed',
              youtube_status = ${needsYouTube ? 'not_found' : song.youtube_status},
              updated_at = NOW()
            WHERE id = ${song.id}::uuid AND user_id = ${userId}
          `
          enriched++
          results.push({
            id: song.id,
            status: 'completed',
            genres: metadataResult.genres,
            moods: metadataResult.moods
          })
        } else if (hasYouTube) {
          // Only YouTube found
          await sql`
            UPDATE songs
            SET
              youtube_id = ${youtubeResult.videoId},
              youtube_status = 'valid',
              thumbnail = COALESCE(thumbnail, ${youtubeResult.thumbnail}),
              enrichment_status = ${needsMetadata ? 'failed' : 'completed'},
              updated_at = NOW()
            WHERE id = ${song.id}::uuid AND user_id = ${userId}
          `
          youtubeLinked++
          results.push({
            id: song.id,
            status: needsMetadata ? 'failed' : 'completed',
            youtubeId: youtubeResult.videoId
          })
        } else {
          // Nothing found
          await sql`
            UPDATE songs
            SET
              enrichment_status = ${needsMetadata ? 'failed' : song.enrichment_status},
              youtube_status = ${needsYouTube ? 'not_found' : song.youtube_status},
              updated_at = NOW()
            WHERE id = ${song.id}::uuid AND user_id = ${userId}
          `
          failed++
          results.push({ id: song.id, status: 'failed' })
        }
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
        processed: songsToEnrich.length,
        enriched,
        youtubeLinked,
        failed,
        remaining: {
          metadata: parseInt(remaining[0]?.metadata_pending || '0'),
          youtube: parseInt(remaining[0]?.youtube_pending || '0')
        },
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
