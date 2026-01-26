// Neon Auth client service
// Uses Neon's auth client which handles OAuth callbacks automatically
// Sessions are managed via HTTP-only cookies

import { createAuthClient } from '@neondatabase/auth'

// In production, use our proxy to handle cross-domain cookies
// In development, use Neon Auth directly (localhost doesn't have cookie issues)
const isProduction = import.meta.env.PROD
const baseURL = isProduction
  ? `${window.location.origin}/neon`
  : import.meta.env.VITE_NEON_AUTH_URL

// Debug logging to help diagnose OAuth issues
console.log('[Auth] Mode:', isProduction ? 'production' : 'development')
console.log('[Auth] Base URL:', baseURL)

const neonAuth = createAuthClient(baseURL)

// Cache the current session for token access
let currentSession = null

export const authClient = {
  // Get current session from Neon Auth
  // On callback pages, this auto-exchanges the neon_auth_session_verifier for a session
  async getSession() {
    try {
      const result = await neonAuth.getSession()
      if (result?.data?.session) {
        currentSession = result.data
        return { data: result.data }
      }
      currentSession = null
      return { data: null }
    } catch (error) {
      console.error('Failed to get session:', error)
      currentSession = null
      return { data: null }
    }
  },

  // Social sign-in methods
  signIn: {
    social({ provider, callbackURL }) {
      neonAuth.signIn.social({
        provider,
        callbackURL
      })
    }
  },

  // Sign out (clears HTTP-only cookie)
  async signOut() {
    try {
      await neonAuth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
    currentSession = null
  }
}

// Get the JWT access token for API calls
// Returns the token from the current session, or null if not authenticated
// This is async to handle race conditions where session isn't loaded yet
export async function getSessionToken() {
  // If no session cached, try to fetch it first
  if (!currentSession) {
    await authClient.getSession()
  }

  // Neon Auth stores token in session.token
  return currentSession?.session?.token || null
}

// Get the user ID from the current session (synchronous)
export function getUserId() {
  return currentSession?.session?.userId || currentSession?.user?.id || null
}

export default authClient
