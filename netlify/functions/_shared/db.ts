import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

// Load .env file for local development
config()

// Create Neon SQL client using server-side environment variable
export function getDb() {
  // Try Netlify.env first (production), then process.env (local dev)
  const databaseUrl = (typeof Netlify !== 'undefined' && Netlify.env?.get('NEON_DATABASE_URL'))
    || process.env.NEON_DATABASE_URL
  if (!databaseUrl) {
    throw new Error('NEON_DATABASE_URL environment variable is not set')
  }
  return neon(databaseUrl)
}

// Note: RLS with set_config doesn't work reliably in serverless
// because each sql call is a separate HTTP request/transaction.
// Instead, always include user_id explicitly in WHERE clauses.
