import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authClient } from '../services/auth-client'

// YouTube token storage keys (separate from Neon Auth session)
const YOUTUBE_TOKEN_KEY = 'tunelayer_youtube_token'
const YOUTUBE_TOKEN_EXPIRY_KEY = 'tunelayer_youtube_token_expiry'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const session = ref(null)
  const youtubeToken = ref(localStorage.getItem(YOUTUBE_TOKEN_KEY) || null)
  const youtubeTokenExpiry = ref(localStorage.getItem(YOUTUBE_TOKEN_EXPIRY_KEY) ? parseInt(localStorage.getItem(YOUTUBE_TOKEN_EXPIRY_KEY)) : null)
  const isLoading = ref(false)
  const error = ref(null)

  // Getters
  const isAuthenticated = computed(() => !!session.value)
  const userEmail = computed(() => user.value?.email || '')
  const userName = computed(() => user.value?.name || '')
  const userPicture = computed(() => user.value?.image || '')
  const hasYouTubeAccess = computed(() => !!youtubeToken.value)

  // Check if YouTube token is still valid (not expired)
  const isYouTubeTokenValid = computed(() => {
    if (!youtubeToken.value) return false
    if (!youtubeTokenExpiry.value) return true // No expiry stored, assume valid
    // Add 60 second buffer to avoid edge cases
    return Date.now() < (youtubeTokenExpiry.value - 60000)
  })

  // Login with Neon Auth (Google provider)
  async function loginWithGoogle() {
    isLoading.value = true
    error.value = null

    try {
      // This redirects to Neon Auth -> Google OAuth
      // Session will be established via HTTP-only cookie on callback
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/auth/callback`
      })
    } catch (e) {
      console.error('[Auth Store] loginWithGoogle error:', e)
      error.value = e.message
      isLoading.value = false
    }
  }

  // Login with Neon Auth (GitHub provider)
  async function loginWithGithub() {
    isLoading.value = true
    error.value = null

    try {
      await authClient.signIn.social({
        provider: 'github',
        callbackURL: `${window.location.origin}/auth/callback`
      })
    } catch (e) {
      console.error('[Auth Store] loginWithGithub error:', e)
      error.value = e.message
      isLoading.value = false
    }
  }

  // Restore session from Neon Auth (uses HTTP-only cookie)
  async function restoreSession() {
    isLoading.value = true
    error.value = null

    try {
      const { data } = await authClient.getSession()

      if (data?.session && data?.user) {
        session.value = data.session
        user.value = data.user
        isLoading.value = false
        return true
      }
    } catch (e) {
      console.error('Failed to restore session:', e)
      error.value = e.message
    }

    isLoading.value = false
    return false
  }

  // Connect YouTube (separate OAuth for YouTube API access)
  function connectYouTube() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const redirectUri = `${window.location.origin}/youtube/callback`
    const scope = encodeURIComponent('https://www.googleapis.com/auth/youtube.readonly')

    window.location.href =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${redirectUri}` +
      `&response_type=token` +
      `&scope=${scope}` +
      `&prompt=consent`
  }

  // Handle YouTube OAuth callback
  function handleYouTubeCallback() {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const token = params.get('access_token')
    const expiresIn = params.get('expires_in')

    if (token) {
      youtubeToken.value = token
      localStorage.setItem(YOUTUBE_TOKEN_KEY, token)

      // Store token expiry time if available
      if (expiresIn) {
        const expiryTime = Date.now() + (parseInt(expiresIn) * 1000)
        youtubeTokenExpiry.value = expiryTime
        localStorage.setItem(YOUTUBE_TOKEN_EXPIRY_KEY, expiryTime.toString())
      }

      // Clear hash from URL
      window.history.replaceState({}, document.title, window.location.pathname)
      return true
    }
    return false
  }

  // Logout
  async function logout() {
    try {
      await authClient.signOut()
    } catch (e) {
      console.error('Sign out error:', e)
    }
    user.value = null
    session.value = null
    youtubeToken.value = null
    youtubeTokenExpiry.value = null
    localStorage.removeItem(YOUTUBE_TOKEN_KEY)
    localStorage.removeItem(YOUTUBE_TOKEN_EXPIRY_KEY)
  }

  // Disconnect YouTube (keep main session)
  function disconnectYouTube() {
    youtubeToken.value = null
    youtubeTokenExpiry.value = null
    localStorage.removeItem(YOUTUBE_TOKEN_KEY)
    localStorage.removeItem(YOUTUBE_TOKEN_EXPIRY_KEY)
  }

  return {
    // State
    user,
    session,
    youtubeToken,
    youtubeTokenExpiry,
    isLoading,
    error,
    // Getters
    isAuthenticated,
    userEmail,
    userName,
    userPicture,
    hasYouTubeAccess,
    isYouTubeTokenValid,
    // Actions
    loginWithGoogle,
    loginWithGithub,
    restoreSession,
    connectYouTube,
    handleYouTubeCallback,
    disconnectYouTube,
    logout
  }
})
