// Neon Auth client service
// Uses Better Auth client (Neon Auth is built on Better Auth)

import { createAuthClient } from 'better-auth/client'

// Session token storage key
const SESSION_KEY = 'tunelayer_session'

// Create Better Auth client pointing to Neon Auth endpoint
const betterAuth = createAuthClient({
  baseURL: import.meta.env.VITE_NEON_AUTH_URL
})

export const authClient = {
  // Get current session from Neon Auth
  async getSession() {
    try {
      const session = await betterAuth.getSession()
      if (session?.data?.session) {
        return { data: session.data }
      }
      return { data: null }
    } catch (error) {
      console.error('Failed to get session:', error)
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

  // Sign out
  async signOut() {
    try {
      await betterAuth.signOut()
      localStorage.removeItem(SESSION_KEY)
    } catch (error) {
      console.error('Sign out error:', error)
      localStorage.removeItem(SESSION_KEY)
    }
  },

  // Store session token (called from callback page)
  setSessionToken(token) {
    localStorage.setItem(SESSION_KEY, token)
  }
}

// Helper to get session token for API calls
export function getSessionToken() {
  return localStorage.getItem(SESSION_KEY)
}

export default authClient
