import type { Context, Config } from "@netlify/functions"
import { getDb } from './_shared/db'
import { validateSession, unauthorizedResponse, jsonResponse, errorResponse } from './_shared/auth'
import { isValidUuid } from './_shared/validation'

export default async (req: Request, context: Context) => {
  // Validate session
  const session = await validateSession(req)
  if (!session) {
    return unauthorizedResponse()
  }

  const userId = session.user.id
  const sql = getDb()

  try {
    // GET /api/history - Get play history for user
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)))

      const history = await sql`
        SELECT
          ph.*,
          s.title,
          s.artist,
          s.thumbnail,
          s.youtube_id
        FROM play_history ph
        JOIN songs s ON ph.song_id = s.id
        WHERE ph.user_id = ${userId}
        ORDER BY ph.played_at DESC
        LIMIT ${limit}
      `
      return jsonResponse(history)
    }

    // POST /api/history - Log a play event
    if (req.method === 'POST') {
      const body = await req.json()

      if (!body.songId) {
        return errorResponse('Missing required field: songId', 400)
      }

      if (!isValidUuid(body.songId)) {
        return errorResponse('Invalid songId format', 400)
      }

      const result = await sql`
        INSERT INTO play_history (user_id, song_id, duration_watched, completed)
        VALUES (
          ${userId},
          ${body.songId}::uuid,
          ${body.durationWatched || null},
          ${body.completed || false}
        )
        RETURNING *
      `

      // Also update the song's play_count and last_played
      await sql`
        UPDATE songs
        SET play_count = play_count + 1, last_played = NOW(), updated_at = NOW()
        WHERE id = ${body.songId}::uuid AND user_id = ${userId}
      `

      return jsonResponse(result[0], 201)
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error('History API error:', error)
    return errorResponse('Internal server error', 500)
  }
}

export const config: Config = {
  path: "/api/history"
}
