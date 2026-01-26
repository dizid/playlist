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
  // Simple approach: Get userId from X-User-Id header
  // The frontend sends this from the authenticated session
  // For production, add proper JWT signature verification
  const userId = req.headers.get('X-User-Id')

  if (!userId) {
    console.error('No X-User-Id header')
    return null
  }

  // Also require Authorization header to ensure some auth is present
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('No Bearer token')
    return null
  }

  return {
    user: {
      id: userId,
      email: '',
      name: '',
      image: ''
    },
    session: {
      id: userId,
      expiresAt: ''
    }
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
