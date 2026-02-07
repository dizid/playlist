import type { Context, Config } from "@netlify/functions"
import { getDb } from './_shared/db'
import { validateSession, unauthorizedResponse, jsonResponse, errorResponse } from './_shared/auth'
import { searchYouTubeVideo } from './_shared/youtube'

// UUID v4 validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id)
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
    // GET /api/songs - Get paginated songs for user with optional filtering
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const genresParam = url.searchParams.get('genres')
      const moodsParam = url.searchParams.get('moods')

      // Pagination params with defaults
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
      const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)))
      const offset = (page - 1) * limit

      // Parse filter arrays
      const genres = genresParam ? genresParam.split(',').filter(g => g) : null
      const moods = moodsParam ? moodsParam.split(',').filter(m => m) : null

      // Get total count and paginated songs
      let songs
      let countResult
      if (genres && moods) {
        countResult = await sql`
          SELECT COUNT(*)::int AS total FROM songs
          WHERE user_id = ${userId} AND genres && ${genres}::text[] AND moods && ${moods}::text[]`
        songs = await sql`
          SELECT * FROM songs
          WHERE user_id = ${userId} AND genres && ${genres}::text[] AND moods && ${moods}::text[]
          ORDER BY popularity DESC NULLS LAST, play_count DESC
          LIMIT ${limit} OFFSET ${offset}`
      } else if (genres) {
        countResult = await sql`
          SELECT COUNT(*)::int AS total FROM songs
          WHERE user_id = ${userId} AND genres && ${genres}::text[]`
        songs = await sql`
          SELECT * FROM songs
          WHERE user_id = ${userId} AND genres && ${genres}::text[]
          ORDER BY popularity DESC NULLS LAST, play_count DESC
          LIMIT ${limit} OFFSET ${offset}`
      } else if (moods) {
        countResult = await sql`
          SELECT COUNT(*)::int AS total FROM songs
          WHERE user_id = ${userId} AND moods && ${moods}::text[]`
        songs = await sql`
          SELECT * FROM songs
          WHERE user_id = ${userId} AND moods && ${moods}::text[]
          ORDER BY popularity DESC NULLS LAST, play_count DESC
          LIMIT ${limit} OFFSET ${offset}`
      } else {
        countResult = await sql`
          SELECT COUNT(*)::int AS total FROM songs
          WHERE user_id = ${userId}`
        songs = await sql`
          SELECT * FROM songs
          WHERE user_id = ${userId}
          ORDER BY popularity DESC NULLS LAST, play_count DESC
          LIMIT ${limit} OFFSET ${offset}`
      }

      const total = countResult[0].total
      return jsonResponse({
        songs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      })
    }

    // POST /api/songs - Add or update a song
    if (req.method === 'POST') {
      const body = await req.json()

      // Only title is required
      if (!body.title) {
        return errorResponse('Missing required field: title', 400)
      }

      // For Shazam/non-YouTube imports, search YouTube for best match
      let youtubeId = body.youtubeId
      let youtubeStatus = 'valid'
      let thumbnail = body.thumbnail || null

      if (!youtubeId && body.artist && body.title) {
        // Search YouTube for best match
        const ytResult = await searchYouTubeVideo(body.artist, body.title)
        if (ytResult) {
          youtubeId = ytResult.videoId
          thumbnail = ytResult.thumbnail
          youtubeStatus = 'valid'
        } else {
          // Fallback to placeholder if YouTube search fails
          const hashInput = `${body.artist}:${body.title}`.toLowerCase()
          const hashCode = Array.from(hashInput).reduce((hash, char) => {
            return ((hash << 5) - hash) + char.charCodeAt(0) | 0
          }, 0)
          youtubeId = `shz${Math.abs(hashCode).toString(36).slice(0, 8)}`
          youtubeStatus = 'not_found'
        }
      } else if (!youtubeId) {
        // No artist/title to search, use placeholder
        const hashInput = `${body.artist || ''}:${body.title}`.toLowerCase()
        const hashCode = Array.from(hashInput).reduce((hash, char) => {
          return ((hash << 5) - hash) + char.charCodeAt(0) | 0
        }, 0)
        youtubeId = `shz${Math.abs(hashCode).toString(36).slice(0, 8)}`
        youtubeStatus = 'not_found'
      }

      const result = await sql`
        INSERT INTO songs (user_id, youtube_id, youtube_status, title, artist, channel, duration, thumbnail, source)
        VALUES (
          ${userId},
          ${youtubeId},
          ${youtubeStatus},
          ${body.title},
          ${body.artist || null},
          ${body.channel || null},
          ${body.duration || null},
          ${thumbnail},
          ${body.source || 'manual'}
        )
        ON CONFLICT (user_id, youtube_id) DO UPDATE SET
          title = EXCLUDED.title,
          artist = COALESCE(EXCLUDED.artist, songs.artist),
          channel = COALESCE(EXCLUDED.channel, songs.channel),
          duration = COALESCE(EXCLUDED.duration, songs.duration),
          thumbnail = COALESCE(EXCLUDED.thumbnail, songs.thumbnail),
          youtube_status = CASE
            WHEN songs.youtube_id LIKE 'shz%' THEN EXCLUDED.youtube_status
            ELSE songs.youtube_status
          END,
          updated_at = NOW()
        RETURNING *
      `
      return jsonResponse(result[0], 201)
    }

    // PATCH /api/songs/:id - Update song (rating, play_count, etc.)
    if (req.method === 'PATCH') {
      const url = new URL(req.url)
      const pathParts = url.pathname.split('/')
      const songId = pathParts[pathParts.length - 1]

      if (!songId || songId === 'songs') {
        return errorResponse('Song ID required', 400)
      }

      if (!isValidUuid(songId)) {
        return errorResponse('Invalid song ID format', 400)
      }

      const body = await req.json()

      // Handle play count increment
      if (body.incrementPlayCount) {
        await sql`
          UPDATE songs
          SET play_count = play_count + 1, last_played = NOW(), updated_at = NOW()
          WHERE id = ${songId}::uuid AND user_id = ${userId}
        `
      }

      // Handle genre/mood update (manual tagging)
      if (body.genres !== undefined || body.moods !== undefined) {
        await sql`
          UPDATE songs
          SET
            genres = COALESCE(${body.genres ?? null}::text[], genres),
            moods = COALESCE(${body.moods ?? null}::text[], moods),
            enrichment_status = 'manual',
            updated_at = NOW()
          WHERE id = ${songId}::uuid AND user_id = ${userId}
        `
      }

      return jsonResponse({ success: true })
    }

    // DELETE /api/songs/:id - Delete a song
    if (req.method === 'DELETE') {
      const url = new URL(req.url)
      const pathParts = url.pathname.split('/')
      const songId = pathParts[pathParts.length - 1]

      if (!songId || songId === 'songs') {
        return errorResponse('Song ID required', 400)
      }

      if (!isValidUuid(songId)) {
        return errorResponse('Invalid song ID format', 400)
      }

      await sql`DELETE FROM songs WHERE id = ${songId}::uuid AND user_id = ${userId}`
      return jsonResponse({ success: true })
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error('Songs API error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'no stack')
    return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500)
  }
}

export const config: Config = {
  path: ["/api/songs", "/api/songs/*"]
}
