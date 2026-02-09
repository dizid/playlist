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
    // POST /api/push/subscribe - Save push subscription
    if (req.method === 'POST') {
      const body = await req.json()

      // Validate required fields
      if (!body.endpoint) {
        return errorResponse('Missing required field: endpoint', 400)
      }
      if (!body.keys?.p256dh) {
        return errorResponse('Missing required field: keys.p256dh', 400)
      }
      if (!body.keys?.auth) {
        return errorResponse('Missing required field: keys.auth', 400)
      }

      // Upsert subscription
      await sql`
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
        VALUES (
          ${userId},
          ${body.endpoint},
          ${body.keys.p256dh},
          ${body.keys.auth},
          ${body.userAgent || null}
        )
        ON CONFLICT (user_id, endpoint) DO UPDATE SET
          p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          user_agent = EXCLUDED.user_agent,
          last_used = NOW()
      `

      return jsonResponse({ success: true, message: 'Push subscription saved' })
    }

    // DELETE /api/push/subscribe - Remove push subscription
    if (req.method === 'DELETE') {
      const body = await req.json()

      if (!body.endpoint) {
        return errorResponse('Missing required field: endpoint', 400)
      }

      await sql`
        DELETE FROM push_subscriptions
        WHERE user_id = ${userId} AND endpoint = ${body.endpoint}
      `

      return jsonResponse({ success: true, message: 'Push subscription removed' })
    }

    // GET /api/push/subscribe - Check if user has active subscriptions
    if (req.method === 'GET') {
      const subscriptions = await sql`
        SELECT endpoint, created_at, last_used
        FROM push_subscriptions
        WHERE user_id = ${userId}
      `

      return jsonResponse({
        hasSubscriptions: subscriptions.length > 0,
        count: subscriptions.length
      })
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error('Push subscription API error:', error)
    return errorResponse('Internal server error', 500)
  }
}

export const config: Config = {
  path: "/api/push/subscribe"
}
