import { neon } from '@neondatabase/serverless'

// Create Neon SQL client using server-side environment variable
export function getDb() {
  const databaseUrl = Netlify.env.get('NEON_DATABASE_URL')
  if (!databaseUrl) {
    throw new Error('NEON_DATABASE_URL environment variable is not set')
  }
  return neon(databaseUrl)
}
