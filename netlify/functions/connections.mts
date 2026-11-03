// Connected music services API (Last.fm, ListenBrainz)
//   GET    /api/connections                 - list the user's connections
//   POST   /api/connections                 - connect { provider, username }
//   POST   /api/connections/:provider/sync  - run one short sync pass (call again until complete)
//   DELETE /api/connections/:provider       - disconnect (imported songs and plays stay)

import type { Context, Config } from "@netlify/functions"
import { getDb } from './_shared/db'
import { validateSession, unauthorizedResponse, jsonResponse, errorResponse } from './_shared/auth'
import { isProvider, getScrobbleClient, ProviderError } from './_shared/scrobble-sources'
import { runConnectionSync, CONNECTION_COLUMNS } from './_shared/connection-sync'

// Work budget per sync request. Netlify stops functions after 10s, and a provider request
// started just before the budget runs out can still take up to 5s.
const SYNC_BUDGET_MS = 4000

const USERNAME_MAX_LENGTH = 64

export default async (req: Request, context: Context) => {
  const session = await validateSession(req)
  if (!session) {
    return unauthorizedResponse()
  }

  const userId = session.user.id
  const sql = getDb()

  try {
    const url = new URL(req.url)
    // ['api', 'connections', provider?, action?]
    const [, , provider, action] = url.pathname.split('/').filter(Boolean)

    // GET /api/connections
    if (req.method === 'GET' && !provider) {
      const rows = await sql`
        SELECT ${sql.unsafe(CONNECTION_COLUMNS)}
        FROM connections
        WHERE user_id = ${userId}
        ORDER BY created_at
      `
      return jsonResponse(rows)
    }

    // POST /api/connections - connect a service by its public username
    if (req.method === 'POST' && !provider) {
      const body = await req.json().catch(() => ({}))
      if (!isProvider(body.provider)) {
        return errorResponse('Unknown music service', 400)
      }
      const username = typeof body.username === 'string' ? body.username.trim() : ''
      if (!username || username.length > USERNAME_MAX_LENGTH || /[\u0000-\u001f/?#]/.test(username)) {
        return errorResponse('Enter a valid username', 400)
      }

      // Make sure the profile exists and its history is readable before saving anything
      let profile
      try {
        profile = await getScrobbleClient(body.provider).getProfile(username)
      } catch (error) {
        if (error instanceof ProviderError && error.userFacing) {
          return errorResponse(error.message, 400)
        }
        throw error
      }

      // Same username again: keep progress. Different username: start the import from scratch.
      const rows = await sql`
        INSERT INTO connections (user_id, provider, external_username, provider_total_plays, status)
        VALUES (${userId}, ${body.provider}, ${profile.username}, ${profile.totalPlays}, 'pending')
        ON CONFLICT (user_id, provider) DO UPDATE SET
          provider_total_plays = EXCLUDED.provider_total_plays,
          status = 'pending',
          last_error = NULL,
          newest_play_ts = CASE WHEN connections.external_username = EXCLUDED.external_username
                                THEN connections.newest_play_ts END,
          oldest_play_ts = CASE WHEN connections.external_username = EXCLUDED.external_username
                                THEN connections.oldest_play_ts END,
          backfill_done = CASE WHEN connections.external_username = EXCLUDED.external_username
                               THEN connections.backfill_done ELSE FALSE END,
          plays_imported = CASE WHEN connections.external_username = EXCLUDED.external_username
                                THEN connections.plays_imported ELSE 0 END,
          external_username = EXCLUDED.external_username,
          updated_at = NOW()
        RETURNING ${sql.unsafe(CONNECTION_COLUMNS)}
      `
      return jsonResponse(rows[0], 201)
    }

    // POST /api/connections/:provider/sync - one short pass; the client repeats until complete
    if (req.method === 'POST' && isProvider(provider) && action === 'sync') {
      const rows = await sql`
        SELECT id FROM connections WHERE user_id = ${userId} AND provider = ${provider}
      `
      if (rows.length === 0) {
        return errorResponse('This service is not connected', 404)
      }
      const outcome = await runConnectionSync(sql, rows[0].id, userId, Date.now() + SYNC_BUDGET_MS)
      return jsonResponse(outcome)
    }

    // DELETE /api/connections/:provider - stop syncing; imported songs and plays stay in the library
    if (req.method === 'DELETE' && isProvider(provider) && !action) {
      await sql`DELETE FROM connections WHERE user_id = ${userId} AND provider = ${provider}`
      return jsonResponse({ disconnected: true })
    }

    return errorResponse('Not found', 404)
  } catch (error) {
    console.error('Connections API error:', error)
    return errorResponse('Internal server error', 500)
  }
}

export const config: Config = {
  path: ["/api/connections", "/api/connections/*"]
}
