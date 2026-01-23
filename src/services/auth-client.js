// Neon Auth client service
// Handles authentication with Neon Auth (Google + GitHub providers)

const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL

// Session token storage key
const SESSION_KEY = 'tunelayer_session'

export const authClient = {
  // Get current session from Neon Auth
  async getSession() {
    const token = localStorage.getItem(SESSION_KEY)
    if (!token) {
      return { data: null }
    }

    try {
      const response = await fetch(`${NEON_AUTH_URL}/api/auth/get-session`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        // Token expired or invalid
        localStorage.removeItem(SESSION_KEY)
        return { data: null }
      }

      const data = await response.json()
      return { data }
    } catch (error) {
      console.error('Failed to get session:', error)
      return { data: null }
    }
  },

  // Social sign-in methods
  signIn: {
    social({ provider, callbackURL }) {
      // Redirect to Neon Auth for OAuth flow
      const encodedCallback = encodeURIComponent(callbackURL)
      window.location.href = `${NEON_AUTH_URL}/api/auth/signin/${provider}?callbackURL=${encodedCallback}`
    }
  },

  // Sign out
  async signOut() {
    const token = localStorage.getItem(SESSION_KEY)
    localStorage.removeItem(SESSION_KEY)

    if (token) {
      try {
        await fetch(`${NEON_AUTH_URL}/api/auth/signout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      } catch (error) {
        console.error('Sign out error:', error)
      }
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
