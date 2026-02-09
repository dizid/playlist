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
    // GET /api/playlists - List all, or GET /api/playlists/:id - Get one with resolved songs
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const pathParts = url.pathname.split('/')
      const lastSegment = pathParts[pathParts.length - 1]

      // If the last path segment is a UUID, fetch that specific playlist + songs
      const playlistId = (lastSegment && lastSegment !== 'playlists' && isValidUuid(lastSegment))
        ? lastSegment
        : null

      // No ID -- return all playlists for user
      if (!playlistId) {
        // Check if last segment looks like an ID but is invalid
        if (lastSegment && lastSegment !== 'playlists') {
          return errorResponse('Invalid playlist ID format', 400)
        }
        const playlists = await sql`
          SELECT * FROM playlists
          WHERE user_id = ${userId}
          ORDER BY created_at DESC`
        return jsonResponse(playlists)
      }

      // Fetch the playlist
      const playlists = await sql`
        SELECT * FROM playlists
        WHERE id = ${playlistId}::uuid AND user_id = ${userId}`

      if (playlists.length === 0) {
        return errorResponse('Playlist not found', 404)
      }

      const playlist = playlists[0]
      let songs: Record<string, unknown>[] = []

      if (playlist.type === 'manual' && Array.isArray(playlist.song_ids) && playlist.song_ids.length > 0) {
        // Manual playlist: fetch songs by ID array, preserving order
        const fetched = await sql`
          SELECT * FROM songs
          WHERE id = ANY(${playlist.song_ids}::uuid[]) AND user_id = ${userId}`

        // Preserve the order from song_ids array
        const songMap = new Map(fetched.map((s: Record<string, unknown>) => [s.id, s]))
        songs = playlist.song_ids
          .map((id: string) => songMap.get(id))
          .filter(Boolean) as Record<string, unknown>[]

      } else if (playlist.type === 'smart' && playlist.rules) {
        // Smart playlist: dynamically build query from rules
        const rules = playlist.rules as {
          minPopularity?: number
          genres?: string[]
          moods?: string[]
          minPlayCount?: number
          sortBy?: string
          sortOrder?: string
          limit?: number
        }

        // Build WHERE clauses and params dynamically
        const conditions: string[] = ['user_id = $1']
        const params: unknown[] = [userId]
        let paramIndex = 2

        if (typeof rules.minPopularity === 'number') {
          conditions.push(`popularity >= $${paramIndex}`)
          params.push(rules.minPopularity)
          paramIndex++
        }

        if (Array.isArray(rules.genres) && rules.genres.length > 0) {
          conditions.push(`genres && $${paramIndex}::text[]`)
          params.push(rules.genres)
          paramIndex++
        }

        if (Array.isArray(rules.moods) && rules.moods.length > 0) {
          conditions.push(`moods && $${paramIndex}::text[]`)
          params.push(rules.moods)
          paramIndex++
        }

        if (typeof rules.minPlayCount === 'number') {
          conditions.push(`play_count >= $${paramIndex}`)
          params.push(rules.minPlayCount)
          paramIndex++
        }

        // Validate sortBy against whitelist to prevent SQL injection
        const allowedSortColumns = ['popularity', 'play_count', 'last_played', 'created_at']
        const sortBy = allowedSortColumns.includes(rules.sortBy || '')
          ? rules.sortBy!
          : 'popularity'
        const sortOrder = rules.sortOrder === 'asc' ? 'ASC' : 'DESC'
        const limit = Math.min(Math.max(rules.limit || 50, 1), 200)
        params.push(limit)

        const query = `
          SELECT * FROM songs
          WHERE ${conditions.join(' AND ')}
          ORDER BY ${sortBy} ${sortOrder} NULLS LAST
          LIMIT $${paramIndex}`

        songs = await sql.query(query, params) as Record<string, unknown>[]
      }

      return jsonResponse({
        playlist,
        songs,
        totalSongs: songs.length
      })
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

      if (!isValidUuid(playlistId)) {
        return errorResponse('Invalid playlist ID format', 400)
      }

      const body = await req.json()

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

      if (!isValidUuid(playlistId)) {
        return errorResponse('Invalid playlist ID format', 400)
      }

      await sql`DELETE FROM playlists WHERE id = ${playlistId}::uuid AND user_id = ${userId}`
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
