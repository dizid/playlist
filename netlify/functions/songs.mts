import type { Context, Config } from "@netlify/functions"
import { getDb } from './_shared/db'
import { validateSession, unauthorizedResponse, jsonResponse, errorResponse } from './_shared/auth'

export default async (req: Request, context: Context) => {
  // Validate session
  const session = await validateSession(req)
  if (!session) {
    return unauthorizedResponse()
  }

  const userId = session.user.id
  const sql = getDb()

  try {
    // GET /api/songs - Get all songs for user
    if (req.method === 'GET') {
      const songs = await sql`
        SELECT * FROM songs
        WHERE user_id = ${userId}
        ORDER BY popularity DESC
      `
      return jsonResponse(songs)
    }

    // POST /api/songs - Add or update a song
    if (req.method === 'POST') {
      const body = await req.json()

      // Validate required fields
      if (!body.youtubeId || !body.title) {
        return errorResponse('Missing required fields: youtubeId, title', 400)
      }

      const result = await sql`
        INSERT INTO songs (user_id, youtube_id, title, artist, channel, duration, thumbnail, source)
        VALUES (
          ${userId},
          ${body.youtubeId},
          ${body.title},
          ${body.artist || null},
          ${body.channel || null},
          ${body.duration || null},
          ${body.thumbnail || null},
          ${body.source || 'manual'}
        )
        ON CONFLICT (user_id, youtube_id) DO UPDATE SET
          title = EXCLUDED.title,
          artist = EXCLUDED.artist,
          channel = EXCLUDED.channel,
          duration = EXCLUDED.duration,
          thumbnail = EXCLUDED.thumbnail,
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

      const body = await req.json()

      // Handle rating update
      if (body.rating !== undefined) {
        await sql`
          UPDATE songs
          SET rating = ${body.rating}, updated_at = NOW()
          WHERE id = ${songId}::uuid AND user_id = ${userId}
        `
      }

      // Handle play count increment
      if (body.incrementPlayCount) {
        await sql`
          UPDATE songs
          SET play_count = play_count + 1, last_played = NOW(), updated_at = NOW()
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

      await sql`
        DELETE FROM songs
        WHERE id = ${songId}::uuid AND user_id = ${userId}
      `
      return jsonResponse({ success: true })
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error('Songs API error:', error)
    return errorResponse('Internal server error', 500)
  }
}

export const config: Config = {
  path: ["/api/songs", "/api/songs/*"]
}
