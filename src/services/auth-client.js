// Neon Auth client service
// Uses official @neondatabase/neon-js SDK for authentication

import { createAuthClient } from '@neondatabase/neon-js/auth'

const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL

// Session token storage key
const SESSION_KEY = 'tunelayer_session'

// Create official Neon Auth client
const neonAuth = createAuthClient(NEON_AUTH_URL)

export const authClient = {
  // Get current session from Neon Auth
  async getSession() {
    try {
      const session = await neonAuth.getSession()
      if (session?.data?.session) {
        return { data: session.data }
      }
      return { data: null }
    } catch (error) {
      console.error('Failed to get session:', error)
      return { data: null }
    }
  },

  // Social sign-in methods - uses official SDK
  signIn: {
    social({ provider, callbackURL }) {
      neonAuth.signIn.social({
        provider,
        callbackURL
      })
    }
  },

  // Sign out - uses official SDK
  async signOut() {
    try {
      await neonAuth.signOut()
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
