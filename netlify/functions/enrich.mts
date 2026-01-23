import type { Context, Config } from "@netlify/functions"
import { getDb, withUserContext } from './_shared/db'
import { validateSession, unauthorizedResponse, jsonResponse, errorResponse } from './_shared/auth'
import { lookupTrackMetadata } from './_shared/metadata'

// Rate limit: 200ms between Last.fm requests (5 req/sec limit)
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
    // POST /api/enrich - Enrich songs with genre/mood data
    if (req.method === 'POST') {
      const body = await req.json()

      // Get songs to enrich
      let songsToEnrich
      if (body.songIds && Array.isArray(body.songIds)) {
        // Specific songs
        songsToEnrich = await withUserContext(sql, userId, () =>
          sql`
            SELECT id, title, artist, channel
            FROM songs
            WHERE id = ANY(${body.songIds}::uuid[])
            AND enrichment_status IN ('pending', 'failed')
            LIMIT ${BATCH_SIZE}
          `
        )
      } else if (body.all === true) {
        // All pending songs
        songsToEnrich = await withUserContext(sql, userId, () =>
          sql`
            SELECT id, title, artist, channel
            FROM songs
            WHERE enrichment_status IN ('pending', 'failed')
            ORDER BY created_at DESC
            LIMIT ${BATCH_SIZE}
          `
        )
      } else {
        return errorResponse('Provide songIds array or all: true', 400)
      }

      let enriched = 0
      let failed = 0
      const results: Array<{ id: string, status: string, genres?: string[], moods?: string[] }> = []

      for (const song of songsToEnrich) {
        // Use artist if available, fall back to channel name
        const artistName = song.artist || song.channel || ''

        if (!artistName) {
          // No artist info - mark as failed
          await withUserContext(sql, userId, () =>
            sql`
              UPDATE songs
              SET enrichment_status = 'failed', updated_at = NOW()
              WHERE id = ${song.id}::uuid
            `
          )
          failed++
          results.push({ id: song.id, status: 'failed' })
          continue
        }

        // Lookup metadata from Last.fm
        const metadata = await lookupTrackMetadata(artistName, song.title)

        if (metadata && (metadata.genres.length > 0 || metadata.moods.length > 0)) {
          // Update song with genres and moods
          await withUserContext(sql, userId, () =>
            sql`
              UPDATE songs
              SET
                genres = ${metadata.genres},
                moods = ${metadata.moods},
                enrichment_status = 'completed',
                updated_at = NOW()
              WHERE id = ${song.id}::uuid
            `
          )
          enriched++
          results.push({ id: song.id, status: 'completed', genres: metadata.genres, moods: metadata.moods })
        } else {
          // No metadata found
          await withUserContext(sql, userId, () =>
            sql`
              UPDATE songs
              SET enrichment_status = 'failed', updated_at = NOW()
              WHERE id = ${song.id}::uuid
            `
          )
          failed++
          results.push({ id: song.id, status: 'failed' })
        }

        // Rate limit between requests
        await delay(RATE_LIMIT_MS)
      }

      // Get remaining count
      const remaining = await withUserContext(sql, userId, () =>
        sql`
          SELECT COUNT(*) as count
          FROM songs
          WHERE enrichment_status = 'pending'
        `
      )

      return jsonResponse({
        processed: songsToEnrich.length,
        enriched,
        failed,
        remaining: parseInt(remaining[0]?.count || '0'),
        results
      })
    }

    // GET /api/enrich/status - Get enrichment status
    if (req.method === 'GET') {
      const status = await withUserContext(sql, userId, () =>
        sql`
          SELECT
            enrichment_status as status,
            COUNT(*) as count
          FROM songs
          GROUP BY enrichment_status
        `
      )

      const counts: Record<string, number> = {
        pending: 0,
        completed: 0,
        failed: 0,
        manual: 0
      }

      for (const row of status) {
        if (row.status && counts.hasOwnProperty(row.status)) {
          counts[row.status] = parseInt(row.count)
        }
      }

      return jsonResponse({
        ...counts,
        total: Object.values(counts).reduce((a, b) => a + b, 0)
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
