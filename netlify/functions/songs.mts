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
    // GET /api/songs - Get all songs for user with optional filtering
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const genresParam = url.searchParams.get('genres')
      const moodsParam = url.searchParams.get('moods')
      const ratingParam = url.searchParams.get('rating')

      // Parse filter arrays
      const genres = genresParam ? genresParam.split(',').filter(g => g) : null
      const moods = moodsParam ? moodsParam.split(',').filter(m => m) : null

      // Build dynamic query based on filters
      let songs
      if (genres && moods) {
        songs = await withUserContext(sql, userId, () =>
          sql`SELECT * FROM songs
              WHERE genres && ${genres}::text[] AND moods && ${moods}::text[]
              ORDER BY popularity DESC NULLS LAST, play_count DESC`
        )
      } else if (genres) {
        songs = await withUserContext(sql, userId, () =>
          sql`SELECT * FROM songs
              WHERE genres && ${genres}::text[]
              ORDER BY popularity DESC NULLS LAST, play_count DESC`
        )
      } else if (moods) {
        songs = await withUserContext(sql, userId, () =>
          sql`SELECT * FROM songs
              WHERE moods && ${moods}::text[]
              ORDER BY popularity DESC NULLS LAST, play_count DESC`
        )
      } else if (ratingParam) {
        songs = await withUserContext(sql, userId, () =>
          sql`SELECT * FROM songs
              WHERE rating = ${ratingParam}
              ORDER BY popularity DESC NULLS LAST, play_count DESC`
        )
      } else {
        songs = await withUserContext(sql, userId, () =>
          sql`SELECT * FROM songs ORDER BY popularity DESC NULLS LAST, play_count DESC`
        )
      }
      return jsonResponse(songs)
    }

    // POST /api/songs - Add or update a song
    if (req.method === 'POST') {
      const body = await req.json()

      // Validate required fields
      if (!body.youtubeId || !body.title) {
        return errorResponse('Missing required fields: youtubeId, title', 400)
      }

      const result = await withUserContext(sql, userId, () =>
        sql`
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
      )
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
        await withUserContext(sql, userId, () =>
          sql`
            UPDATE songs
            SET rating = ${body.rating}, updated_at = NOW()
            WHERE id = ${songId}::uuid
          `
        )
      }

      // Handle play count increment
      if (body.incrementPlayCount) {
        await withUserContext(sql, userId, () =>
          sql`
            UPDATE songs
            SET play_count = play_count + 1, last_played = NOW(), updated_at = NOW()
            WHERE id = ${songId}::uuid
          `
        )
      }

      // Handle genre/mood update (manual tagging)
      if (body.genres !== undefined || body.moods !== undefined) {
        await withUserContext(sql, userId, () =>
          sql`
            UPDATE songs
            SET
              genres = COALESCE(${body.genres ?? null}::text[], genres),
              moods = COALESCE(${body.moods ?? null}::text[], moods),
              enrichment_status = 'manual',
              updated_at = NOW()
            WHERE id = ${songId}::uuid
          `
        )
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

      await withUserContext(sql, userId, () =>
        sql`DELETE FROM songs WHERE id = ${songId}::uuid`
      )
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
