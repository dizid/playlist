// Session validation using Firebase Admin SDK
// Verifies Firebase ID tokens from the Authorization header

import admin from 'firebase-admin'

export interface Session {
  user: {
    id: string
    email: string
    name?: string
    image?: string
  }
  session: {
    id: string
    expiresAt: string
  }
}

// Initialize Firebase Admin once (uses env vars, not JSON file)
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey })
    })
  } else {
    console.error('[Auth] Missing Firebase Admin env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)')
  }
}

// Cache verified tokens briefly to reduce Firebase calls (5 min TTL)
const tokenCache = new Map<string, { session: Session; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000
let lastCacheCleanup = Date.now()
const CLEANUP_INTERVAL_MS = 60 * 1000

export async function validateSession(req: Request): Promise<Session | null> {
  // Get token from Authorization header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('No Bearer token in Authorization header')
    return null
  }

  const token = authHeader.slice(7)
  if (!token) {
    console.error('Empty token')
    return null
  }

  // Check cache first
  const cached = tokenCache.get(token)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.session
  }

  if (!admin.apps.length) {
    console.error('[Auth] Firebase Admin not initialized')
    return null
  }

  try {
    // Verify Firebase ID token
    const decoded = await admin.auth().verifyIdToken(token)

    const session: Session = {
      user: {
        id: decoded.uid,
        email: decoded.email || '',
        name: decoded.name || '',
        image: decoded.picture || ''
      },
      session: {
        id: decoded.uid,
        expiresAt: new Date(decoded.exp * 1000).toISOString()
      }
    }

    // Cache the verified token
    const now = Date.now()
    tokenCache.set(token, {
      session,
      expiresAt: now + CACHE_TTL_MS
    })

    // Evict expired entries periodically
    if (now - lastCacheCleanup > CLEANUP_INTERVAL_MS || tokenCache.size > 1000) {
      lastCacheCleanup = now
      for (const [key, value] of tokenCache) {
        if (value.expiresAt < now) {
          tokenCache.delete(key)
        }
      }
    }

    return session
  } catch (error) {
    console.error('[Auth] Token verification error:', error)
    return null
  }
}

// Helper to create unauthorized response
export function unauthorizedResponse() {
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers }
  )
}

// Helper to create JSON response
export function jsonResponse(data: unknown, status = 200) {
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  return new Response(
    JSON.stringify(data),
    { status, headers }
  )
}

// Helper to create error response
export function errorResponse(message: string, status = 500) {
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers }
  )
}

// Allowed origins for CORS validation
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:8888',
]

export function getAllowedOrigins(): string[] {
  const origins = new Set(DEFAULT_ALLOWED_ORIGINS)

  const envOrigins = process.env.ALLOWED_ORIGINS
  if (envOrigins) {
    envOrigins.split(',').map(o => o.trim()).filter(Boolean).forEach(o => origins.add(o))
  }

  const netlifyUrl = process.env.URL
  if (netlifyUrl) origins.add(netlifyUrl.replace(/\/$/, ''))
  const deployUrl = process.env.DEPLOY_PRIME_URL
  if (deployUrl) origins.add(deployUrl.replace(/\/$/, ''))

  return [...origins]
}

export function validateOrigin(req: Request): string | null {
  const origin = req.headers.get('Origin')
  if (!origin) return null
  const allowed = getAllowedOrigins()
  return allowed.includes(origin) ? origin : null
}
