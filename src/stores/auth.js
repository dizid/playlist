import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authClient, waitForAuthReady, onOAuthToken } from '../services/auth-client'

// YouTube token storage keys (separate from Firebase Auth)
const YOUTUBE_TOKEN_KEY = 'tunelayer_youtube_token'
const YOUTUBE_TOKEN_EXPIRY_KEY = 'tunelayer_youtube_token_expiry'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const session = ref(null)
  const youtubeToken = ref(localStorage.getItem(YOUTUBE_TOKEN_KEY) || null)
  const storedExpiry = localStorage.getItem(YOUTUBE_TOKEN_EXPIRY_KEY)
  const youtubeTokenExpiry = ref(storedExpiry ? parseInt(storedExpiry, 10) : null)
  const isLoading = ref(false)
  const error = ref(null)

  // Getters
  const isAuthenticated = computed(() => !!user.value)
  const userEmail = computed(() => user.value?.email || '')
  const userName = computed(() => user.value?.name || '')
  const userPicture = computed(() => user.value?.image || '')
  const hasYouTubeAccess = computed(() => !!youtubeToken.value)

  // Check if YouTube token is still valid (not expired)
  const isYouTubeTokenValid = computed(() => {
    if (!youtubeToken.value) return false
    if (!youtubeTokenExpiry.value) return true
    return Date.now() < (youtubeTokenExpiry.value - 60000)
  })

  // Register callback to capture Google OAuth access token (for YouTube API)
  // This fires after Google sign-in redirect returns with the youtube.readonly scope
  onOAuthToken((accessToken) => {
    console.log('[Auth] YouTube access token received from Google sign-in')
    youtubeToken.value = accessToken
    localStorage.setItem(YOUTUBE_TOKEN_KEY, accessToken)

    // Google OAuth tokens expire in ~3600 seconds (1 hour)
    const expiryTime = Date.now() + (3600 * 1000)
    youtubeTokenExpiry.value = expiryTime
    localStorage.setItem(YOUTUBE_TOKEN_EXPIRY_KEY, expiryTime.toString())
  })

  // Login with Firebase (Google) — redirects away, onAuthStateChanged handles return
  // YouTube access token is captured automatically via onOAuthToken callback
  async function loginWithGoogle() {
    isLoading.value = true
    error.value = null

    try {
      await authClient.signIn.social({ provider: 'google' })
      // Page navigates away — on return, restoreSession() picks up the user
    } catch (e) {
      console.error('[Auth Store] loginWithGoogle error:', e)
      error.value = e.message
      isLoading.value = false
    }
  }

  // Login with Firebase (GitHub) — redirects away, onAuthStateChanged handles return
  async function loginWithGithub() {
    isLoading.value = true
    error.value = null

    try {
      await authClient.signIn.social({ provider: 'github' })
    } catch (e) {
      console.error('[Auth Store] loginWithGithub error:', e)
      error.value = e.message
      isLoading.value = false
    }
  }

  // Deduplicate concurrent restoreSession calls
  let restorePromise = null

  // Restore session — waits for Firebase auth state to resolve
  async function restoreSession() {
    if (user.value && session.value) return true
    if (restorePromise) return restorePromise

    restorePromise = _doRestoreSession()
    try {
      return await restorePromise
    } finally {
      restorePromise = null
    }
  }

  async function _doRestoreSession() {
    isLoading.value = true
    error.value = null

    try {
      // Wait for Firebase to check IndexedDB for existing session
      await waitForAuthReady()

      // Try to get session data from Firebase
      const { data } = await authClient.getSession()

      if (data?.user && data?.session) {
        console.log('[Auth] Session restored for:', data.user.email)
        user.value = data.user
        session.value = data.session
        isLoading.value = false
        return true
      }
      console.log('[Auth] No active session')
    } catch (e) {
      console.error('[Auth] Failed to restore session:', e)
      error.value = e.message
    }

    isLoading.value = false
    return false
  }

  // Handle 401 from API calls — clear session and redirect to login
  function handleUnauthorized() {
    user.value = null
    session.value = null
    authClient.clearSession()
    error.value = 'Your session has expired. Please sign in again.'
    if (window.location.pathname !== '/') {
      window.location.href = '/'
    }
  }

  // Clear error (for UI dismiss)
  function clearError() {
    error.value = null
  }

  // Reconnect YouTube — re-triggers Google sign-in (which includes YouTube scope)
  // Used when the OAuth access token has expired (~1 hour)
  function reconnectYouTube() {
    authClient.signIn.social({ provider: 'google' })
  }

  // Disconnect YouTube (keep main session)
  function disconnectYouTube() {
    youtubeToken.value = null
    youtubeTokenExpiry.value = null
    localStorage.removeItem(YOUTUBE_TOKEN_KEY)
    localStorage.removeItem(YOUTUBE_TOKEN_EXPIRY_KEY)
  }

  // Logout — clears Firebase session and all local state
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
    handleUnauthorized,
    clearError,
    reconnectYouTube,
    disconnectYouTube,
    logout
  }
})
