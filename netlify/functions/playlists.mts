import type { Context, Config } from "@netlify/functions"
import { getDb, withUserContext } from './_shared/db'
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
      const playlists = await withUserContext(sql, userId, () =>
        sql`SELECT * FROM playlists ORDER BY created_at DESC`
      )
      return jsonResponse(playlists)
    }

    // POST /api/playlists - Create a new playlist
    if (req.method === 'POST') {
      const body = await req.json()

      if (!body.name) {
        return errorResponse('Missing required field: name', 400)
      }

      const result = await withUserContext(sql, userId, () =>
        sql`
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
      )
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

      if (body.name !== undefined) {
        await withUserContext(sql, userId, () =>
          sql`
            UPDATE playlists
            SET name = ${body.name}, updated_at = NOW()
            WHERE id = ${playlistId}::uuid
          `
        )
      }

      if (body.rules !== undefined) {
        await withUserContext(sql, userId, () =>
          sql`
            UPDATE playlists
            SET rules = ${JSON.stringify(body.rules)}, updated_at = NOW()
            WHERE id = ${playlistId}::uuid
          `
        )
      }

      if (body.songIds !== undefined) {
        await withUserContext(sql, userId, () =>
          sql`
            UPDATE playlists
            SET song_ids = ${body.songIds}, updated_at = NOW()
            WHERE id = ${playlistId}::uuid
          `
        )
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

      await withUserContext(sql, userId, () =>
        sql`DELETE FROM playlists WHERE id = ${playlistId}::uuid`
      )
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
