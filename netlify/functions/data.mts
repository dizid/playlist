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
    // GET /api/data/export - Export all user data (songs + playlists)
    if (req.method === 'GET') {
      // Fetch all songs for user
      const songs = await sql`
        SELECT
          youtube_id,
          title,
          artist,
          channel,
          thumbnail,
          rating,
          play_count,
          last_played,
          genres,
          moods,
          popularity,
          enrichment_status,
          youtube_status,
          created_at,
          updated_at
        FROM songs
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `

      // Fetch all playlists for user
      const playlists = await sql`
        SELECT
          name,
          description,
          type,
          rules,
          song_ids,
          created_at,
          updated_at
        FROM playlists
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `

      // Build export object
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        songs: songs.map(s => ({
          youtube_id: s.youtube_id,
          title: s.title,
          artist: s.artist,
          channel: s.channel,
          thumbnail: s.thumbnail,
          rating: s.rating,
          play_count: s.play_count,
          last_played: s.last_played,
          genres: s.genres || [],
          moods: s.moods || [],
          popularity: s.popularity,
          enrichment_status: s.enrichment_status,
          youtube_status: s.youtube_status,
          created_at: s.created_at,
          updated_at: s.updated_at
        })),
        playlists: playlists.map(p => ({
          name: p.name,
          description: p.description,
          type: p.type,
          rules: p.rules,
          song_ids: p.song_ids || [],
          created_at: p.created_at,
          updated_at: p.updated_at
        }))
      }

      return new Response(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="tunecraft-export.json"',
          'X-Content-Type-Options': 'nosniff'
        }
      })
    }

    // DELETE /api/data - Delete all user data (full reset)
    if (req.method === 'DELETE') {
      // Delete in order due to foreign key constraints
      // 1. Delete play history first (references songs)
      await sql`DELETE FROM play_history WHERE user_id = ${userId}`

      // 2. Delete playlists
      await sql`DELETE FROM playlists WHERE user_id = ${userId}`

      // 3. Delete songs
      await sql`DELETE FROM songs WHERE user_id = ${userId}`

      return jsonResponse({
        success: true,
        message: 'All data deleted successfully'
      })
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error('Data API error:', error)
    return errorResponse('Internal server error', 500)
  }
}

export const config: Config = {
  path: ["/api/data", "/api/data/export"]
}
