// Neon Auth client service
// Uses Better Auth client (Neon Auth is built on Better Auth)
// Sessions are managed via HTTP-only cookies

import { createAuthClient } from 'better-auth/client'

// Create Better Auth client pointing to Neon Auth endpoint
// credentials: 'include' enables cross-origin cookie handling
const betterAuth = createAuthClient({
  baseURL: import.meta.env.VITE_NEON_AUTH_URL,
  fetchOptions: {
    credentials: 'include'
  }
})

// Cache the current session for token access
let currentSession = null

export const authClient = {
  // Get current session from Neon Auth (reads HTTP-only cookie)
  async getSession() {
    try {
      const result = await betterAuth.getSession()
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
      betterAuth.signIn.social({
        provider,
        callbackURL
      })
    }
  },

  // Sign out (clears HTTP-only cookie)
  async signOut() {
    try {
      await betterAuth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
    currentSession = null
  }
}

// Get the JWT access token for API calls
// Returns the token from the current session, or null if not authenticated
export function getSessionToken() {
  // Return the session's access token (JWT) for API authorization
  return currentSession?.session?.token || currentSession?.session?.accessToken || null
}

export default authClient
