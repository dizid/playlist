import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authClient, getSessionToken } from '../services/auth-client'

// YouTube token storage key (separate from Neon Auth session)
const YOUTUBE_TOKEN_KEY = 'tunelayer_youtube_token'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const session = ref(null)
  const youtubeToken = ref(localStorage.getItem(YOUTUBE_TOKEN_KEY) || null)
  const isLoading = ref(false)
  const error = ref(null)

  // Getters
  const isAuthenticated = computed(() => !!session.value)
  const userEmail = computed(() => user.value?.email || '')
  const userName = computed(() => user.value?.name || '')
  const userPicture = computed(() => user.value?.image || '')
  const accessToken = computed(() => getSessionToken())
  const hasYouTubeAccess = computed(() => !!youtubeToken.value)

  // Login with Neon Auth (Google provider)
  async function loginWithGoogle() {
    isLoading.value = true
    error.value = null

    try {
      authClient.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/auth/callback`
      })
    } catch (e) {
      error.value = e.message
      isLoading.value = false
    }
  }

  // Login with Neon Auth (GitHub provider)
  async function loginWithGithub() {
    isLoading.value = true
    error.value = null

    try {
      authClient.signIn.social({
        provider: 'github',
        callbackURL: `${window.location.origin}/auth/callback`
      })
    } catch (e) {
      error.value = e.message
      isLoading.value = false
    }
  }

  // Handle Neon Auth callback
  async function handleAuthCallback(token) {
    if (token) {
      authClient.setSessionToken(token)
      return restoreSession()
    }
    return false
  }

  // Restore session on app load
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

    if (token) {
      youtubeToken.value = token
      localStorage.setItem(YOUTUBE_TOKEN_KEY, token)

      // Clear hash from URL
      window.history.replaceState({}, document.title, window.location.pathname)
      return true
    }
    return false
  }

  // Logout
  async function logout() {
    await authClient.signOut()
    user.value = null
    session.value = null
    youtubeToken.value = null
    localStorage.removeItem(YOUTUBE_TOKEN_KEY)
  }

  // Disconnect YouTube (keep main session)
  function disconnectYouTube() {
    youtubeToken.value = null
    localStorage.removeItem(YOUTUBE_TOKEN_KEY)
  }

  return {
    // State
    user,
    session,
    youtubeToken,
    isLoading,
    error,
    // Getters
    isAuthenticated,
    userEmail,
    userName,
    userPicture,
    accessToken,
    hasYouTubeAccess,
    // Actions
    loginWithGoogle,
    loginWithGithub,
    handleAuthCallback,
    restoreSession,
    connectYouTube,
    handleYouTubeCallback,
    disconnectYouTube,
    logout
  }
})
