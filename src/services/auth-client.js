// Neon Auth client service
// Uses Better Auth client (Neon Auth is built on Better Auth)
// Sessions are managed via HTTP-only cookies - no localStorage needed

import { createAuthClient } from 'better-auth/client'

// Create Better Auth client pointing to Neon Auth endpoint
const betterAuth = createAuthClient({
  baseURL: import.meta.env.VITE_NEON_AUTH_URL
})

export const authClient = {
  // Get current session from Neon Auth (reads HTTP-only cookie)
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

  // Sign out (clears HTTP-only cookie)
  async signOut() {
    try {
      await betterAuth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }
}

export default authClient
