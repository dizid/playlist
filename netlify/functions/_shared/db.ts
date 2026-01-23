import { neon, NeonQueryFunction } from '@neondatabase/serverless'

// Create Neon SQL client using server-side environment variable
export function getDb() {
  const databaseUrl = Netlify.env.get('NEON_DATABASE_URL')
  if (!databaseUrl) {
    throw new Error('NEON_DATABASE_URL environment variable is not set')
  }
  return neon(databaseUrl)
}

// Execute queries with user context for RLS
// Sets the session variable before running the query function
export async function withUserContext<T>(
  sql: NeonQueryFunction<false, false>,
  userId: string,
  queryFn: () => Promise<T>
): Promise<T> {
  await sql`SELECT set_config('app.current_user_id', ${userId}, false)`
  return queryFn()
}
