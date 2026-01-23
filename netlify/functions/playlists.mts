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
    // GET /api/playlists - Get all playlists for user
    if (req.method === 'GET') {
      const playlists = await sql`
        SELECT * FROM playlists
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `
      return jsonResponse(playlists)
    }

    // POST /api/playlists - Create a new playlist
    if (req.method === 'POST') {
      const body = await req.json()

      if (!body.name) {
        return errorResponse('Missing required field: name', 400)
      }

      const result = await sql`
        INSERT INTO playlists (user_id, name, type, rules, song_ids)
        VALUES (
          ${userId},
          ${body.name},
          ${body.type || 'smart'},
          ${body.rules ? JSON.stringify(body.rules) : null},
          ${body.songIds || null}
        )
        RETURNING *
      `
      return jsonResponse(result[0], 201)
    }

    // PATCH /api/playlists/:id - Update a playlist
    if (req.method === 'PATCH') {
      const url = new URL(req.url)
      const pathParts = url.pathname.split('/')
      const playlistId = pathParts[pathParts.length - 1]

      if (!playlistId || playlistId === 'playlists') {
        return errorResponse('Playlist ID required', 400)
      }

      const body = await req.json()

      // Build dynamic update query
      const updates: string[] = []
      const values: unknown[] = []

      if (body.name !== undefined) {
        await sql`
          UPDATE playlists
          SET name = ${body.name}, updated_at = NOW()
          WHERE id = ${playlistId}::uuid AND user_id = ${userId}
        `
      }

      if (body.rules !== undefined) {
        await sql`
          UPDATE playlists
          SET rules = ${JSON.stringify(body.rules)}, updated_at = NOW()
          WHERE id = ${playlistId}::uuid AND user_id = ${userId}
        `
      }

      if (body.songIds !== undefined) {
        await sql`
          UPDATE playlists
          SET song_ids = ${body.songIds}, updated_at = NOW()
          WHERE id = ${playlistId}::uuid AND user_id = ${userId}
        `
      }

      return jsonResponse({ success: true })
    }

    // DELETE /api/playlists/:id - Delete a playlist
    if (req.method === 'DELETE') {
      const url = new URL(req.url)
      const pathParts = url.pathname.split('/')
      const playlistId = pathParts[pathParts.length - 1]

      if (!playlistId || playlistId === 'playlists') {
        return errorResponse('Playlist ID required', 400)
      }

      await sql`
        DELETE FROM playlists
        WHERE id = ${playlistId}::uuid AND user_id = ${userId}
      `
      return jsonResponse({ success: true })
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error('Playlists API error:', error)
    return errorResponse('Internal server error', 500)
  }
}

export const config: Config = {
  path: ["/api/playlists", "/api/playlists/*"]
}
