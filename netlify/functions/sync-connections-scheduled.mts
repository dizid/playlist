// Hourly job: fetch new plays for every connected service and continue unfinished
// history imports, so the library stays fresh without the user opening TuneCraft.

import type { Config } from "@netlify/functions"
import { getDb } from './_shared/db'
import { runConnectionSync } from './_shared/connection-sync'

// Netlify stops scheduled functions after 30s; leave room for a page still in flight
const RUN_BUDGET_MS = 20000

// Upper bound per run; the rest are picked up next hour (longest-waiting first)
const MAX_CONNECTIONS_PER_RUN = 50

export default async () => {
  const deadline = Date.now() + RUN_BUDGET_MS
  const sql = getDb()

  // Connections in 'error' need the user to act (unknown user, private profile) and are skipped
  const connections = await sql`
    SELECT id, user_id FROM connections
    WHERE status <> 'error'
    ORDER BY last_synced_at NULLS FIRST
    LIMIT ${MAX_CONNECTIONS_PER_RUN}
  `

  for (const connection of connections) {
    if (Date.now() >= deadline) break
    try {
      await runConnectionSync(sql, connection.id, connection.user_id, deadline)
    } catch (error) {
      // Database trouble for one connection should not stop the others
      console.error(`[Scheduled sync] connection ${connection.id} failed:`, error)
    }
  }

  return new Response(null, { status: 204 })
}

export const config: Config = {
  schedule: '@hourly'
}
