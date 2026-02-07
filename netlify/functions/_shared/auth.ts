// Session validation for Neon Auth
// Validates JWT tokens by calling Neon Auth's session endpoint

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

// Cache verified sessions briefly to reduce auth calls (5 min TTL)
const sessionCache = new Map<string, { session: Session; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000
let lastCacheCleanup = Date.now()
const CLEANUP_INTERVAL_MS = 60 * 1000 // Run eviction at most once per minute

export async function validateSession(req: Request): Promise<Session | null> {
  // Get token from Authorization header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('No Bearer token in Authorization header')
    return null
  }

  const token = authHeader.slice(7) // Remove "Bearer " prefix
  if (!token) {
    console.error('Empty token')
    return null
  }

  // Check cache first
  const cached = sessionCache.get(token)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.session
  }

  // Verify token with Neon Auth
  const neonAuthUrl = process.env.NEON_AUTH_URL
  if (!neonAuthUrl) {
    console.error('NEON_AUTH_URL not configured')
    return null
  }

  try {
    // Call Neon Auth session endpoint to verify token and get user data
    const response = await fetch(`${neonAuthUrl}/neondb/auth/session`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('Token verification failed:', response.status)
      return null
    }

    const data = await response.json()

    // Neon Auth returns { session: {...}, user: {...} }
    if (!data.session || !data.user) {
      console.error('Invalid session response from Neon Auth')
      return null
    }

    const session: Session = {
      user: {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.name || '',
        image: data.user.image || ''
      },
      session: {
        id: data.session.id || data.session.userId,
        expiresAt: data.session.expiresAt || ''
      }
    }

    // Cache the verified session
    const now = Date.now()
    sessionCache.set(token, {
      session,
      expiresAt: now + CACHE_TTL_MS
    })

    // Evict expired entries periodically (every 60s or when cache grows large)
    if (now - lastCacheCleanup > CLEANUP_INTERVAL_MS || sessionCache.size > 1000) {
      lastCacheCleanup = now
      for (const [key, value] of sessionCache) {
        if (value.expiresAt < now) {
          sessionCache.delete(key)
        }
      }
    }

    return session
  } catch (error) {
    console.error('Session verification error:', error)
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

// Allowed origins for CORS and auth proxy validation
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:8888',
]

/**
 * Returns the list of allowed origins from ALLOWED_ORIGINS env var
 * (comma-separated) merged with dev defaults.
 */
export function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS
  if (envOrigins) {
    const parsed = envOrigins.split(',').map(o => o.trim()).filter(Boolean)
    return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...parsed])]
  }
  return DEFAULT_ALLOWED_ORIGINS
}

/**
 * Validates that a request Origin header is in the allowed list.
 * Returns the origin string if valid, null otherwise.
 */
export function validateOrigin(req: Request): string | null {
  const origin = req.headers.get('Origin')
  if (!origin) return null
  const allowed = getAllowedOrigins()
  return allowed.includes(origin) ? origin : null
}
