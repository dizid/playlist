// Session validation for Neon Auth
// Validates JWT tokens from Authorization header

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

export async function validateSession(req: Request): Promise<Session | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)
  if (!token) {
    return null
  }

  const authUrl = Netlify.env.get('NEON_AUTH_URL')
  if (!authUrl) {
    console.error('NEON_AUTH_URL environment variable is not set')
    return null
  }

  try {
    // Validate token with Neon Auth endpoint
    const response = await fetch(`${authUrl}/api/auth/get-session`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      console.error('Session validation failed:', response.status)
      return null
    }

    const data = await response.json()

    // Neon Auth returns { user, session } structure
    if (!data?.user?.id) {
      return null
    }

    return data as Session
  } catch (error) {
    console.error('Session validation error:', error)
    return null
  }
}

// Helper to create unauthorized response
export function unauthorizedResponse() {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

// Helper to create JSON response
export function jsonResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

// Helper to create error response
export function errorResponse(message: string, status = 500) {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}
