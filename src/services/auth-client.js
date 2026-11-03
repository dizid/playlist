// Firebase Auth client service
// Replaces Neon Auth — client-side only, no proxy needed.
// Firebase handles session persistence automatically via IndexedDB.

import {
  signInWithRedirect,
  reauthenticateWithRedirect,
  linkWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider
} from 'firebase/auth'
import { auth, googleProvider, githubProvider, facebookProvider, xProvider, youtubeProvider } from './firebase'

// Sign-in providers by the name the UI uses
const SIGN_IN_PROVIDER_MAP = {
  google: googleProvider,
  github: githubProvider,
  facebook: facebookProvider,
  x: xProvider
}

// In-memory cache of current Firebase user
let currentUser = null

// Callback for when we get a Google OAuth access token (for YouTube API)
let onOAuthTokenCallback = null

// Callback for a sign-in that failed after the redirect came back (e.g. email already used)
let onRedirectErrorCallback = null

// Set right before the "Connect YouTube" redirect. Only a redirect that asked for the
// YouTube scope may store its access token; a plain sign-in token can't read YouTube.
const YOUTUBE_CONNECT_FLAG = 'tunecraft_youtube_connect_pending'

// Reads and clears the flag (sessionStorage survives the same-tab redirect)
function takeYouTubeConnectFlag() {
  try {
    const pending = sessionStorage.getItem(YOUTUBE_CONNECT_FLAG) === '1'
    sessionStorage.removeItem(YOUTUBE_CONNECT_FLAG)
    return pending
  } catch {
    return false
  }
}

// Promise that resolves when Firebase auth state is first determined
// (on page load, Firebase checks IndexedDB for existing session)
let authReady = null
let authReadyResolve = null

function initAuthReady() {
  authReady = new Promise((resolve) => {
    authReadyResolve = resolve
  })

  // Listen for auth state changes — fires immediately with cached user or null
  onAuthStateChanged(auth, (user) => {
    currentUser = user || null
    if (authReadyResolve) {
      authReadyResolve()
      authReadyResolve = null
    }
  })

  // Check for redirect result (fires after a sign-in or "Connect YouTube" redirect returns)
  const youtubeConnectPending = takeYouTubeConnectFlag()
  getRedirectResult(auth).then((result) => {
    if (result?.user) {
      if (!currentUser) {
        currentUser = result.user
        if (authReadyResolve) {
          authReadyResolve()
          authReadyResolve = null
        }
      }

      // Keep the Google access token only when this redirect asked for YouTube access
      if (youtubeConnectPending) {
        const credential = GoogleAuthProvider.credentialFromResult(result)
        if (credential?.accessToken && onOAuthTokenCallback) {
          onOAuthTokenCallback(credential.accessToken)
        }
      }
    }
  }).catch((error) => {
    // Connecting YouTube with a different Google account than the TuneCraft login
    // (auth/user-mismatch, auth/credential-already-in-use) still yields a usable token
    if (youtubeConnectPending) {
      const credential = GoogleAuthProvider.credentialFromError(error)
      if (credential?.accessToken && onOAuthTokenCallback) {
        onOAuthTokenCallback(credential.accessToken)
        return
      }
    }
    if (error?.code && error.code !== 'auth/popup-closed-by-user') {
      console.error('[Auth] Redirect result error:', error.code, error.message)
      if (onRedirectErrorCallback) onRedirectErrorCallback(extractErrorMessage(error))
    }
  })
}

// Initialize on module load
initAuthReady()

// Wait for Firebase to determine initial auth state
export function waitForAuthReady() {
  return authReady
}

export const authClient = {
  // Get current session data (matches old interface shape)
  async getSession() {
    await authReady
    if (!currentUser) return { data: null }

    return {
      data: {
        user: {
          id: currentUser.uid,
          email: currentUser.email || '',
          name: currentUser.displayName || '',
          image: currentUser.photoURL || ''
        },
        session: {
          id: currentUser.uid,
          token: await currentUser.getIdToken(),
          expiresAt: null // Firebase manages token refresh automatically
        }
      }
    }
  },

  // Restore from Firebase's built-in persistence (IndexedDB)
  // Returns synchronously if user is already loaded, otherwise waits
  restoreFromStorage() {
    if (!currentUser) return { data: null }

    return {
      data: {
        user: {
          id: currentUser.uid,
          email: currentUser.email || '',
          name: currentUser.displayName || '',
          image: currentUser.photoURL || ''
        },
        session: {
          id: currentUser.uid,
          token: null, // Token fetched async via getSessionToken()
          expiresAt: null
        }
      }
    }
  },

  // Clear session (Firebase handles this via signOut)
  clearSession() {
    currentUser = null
  },

  // Social sign-in via redirect (no popup blockers, works on mobile)
  signIn: {
    async social({ provider }) {
      try {
        const authProvider = SIGN_IN_PROVIDER_MAP[provider]
        if (!authProvider) throw new Error(`Unknown sign-in provider: ${provider}`)
        // This navigates away from the page — on return, onAuthStateChanged fires
        await signInWithRedirect(auth, authProvider)
      } catch (error) {
        const message = extractErrorMessage(error)
        console.error('[Auth] signIn.social error:', message)
        throw new Error(message)
      }
    }
  },

  // Ask Google for YouTube read access for the signed-in user (redirects away).
  // Google users re-confirm their Google account; others (GitHub) link a Google account.
  async connectYouTube() {
    await authReady
    if (!currentUser) throw new Error('Sign in first to connect YouTube.')

    try {
      sessionStorage.setItem(YOUTUBE_CONNECT_FLAG, '1')
    } catch {
      // Storage blocked: the token can't be kept after the redirect
      throw new Error('Your browser blocks storage for this site, so YouTube can\'t be connected.')
    }

    const hasGoogleLogin = currentUser.providerData.some(p => p.providerId === 'google.com')
    try {
      if (hasGoogleLogin) {
        await reauthenticateWithRedirect(currentUser, youtubeProvider)
      } else {
        await linkWithRedirect(currentUser, youtubeProvider)
      }
    } catch (error) {
      takeYouTubeConnectFlag()
      const message = extractErrorMessage(error)
      console.error('[Auth] connectYouTube error:', message)
      throw new Error(message)
    }
  },

  // Sign out
  async signOut() {
    try {
      await firebaseSignOut(auth)
    } catch (error) {
      console.error('[Auth] Sign out error:', error)
    }
    currentUser = null
  }
}

// Convert Firebase error codes to user-readable messages
function extractErrorMessage(error) {
  const code = error?.code || ''
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Sign-in cancelled.'
  if (code === 'auth/popup-blocked') return 'Sign-in was blocked by the browser. Retrying with redirect...'
  if (code === 'auth/account-exists-with-different-credential') {
    return 'You already have a TuneCraft account with this email. Sign in with the button you used before.'
  }
  if (code === 'auth/network-request-failed') return 'Network error. Check your connection and try again.'
  if (error?.message) return error.message
  return 'Sign-in failed. Please try again.'
}

// Get Firebase ID token for API calls (auto-refreshes if expired)
export async function getSessionToken() {
  if (!currentUser) {
    await authReady
  }
  if (!currentUser) return null

  try {
    return await currentUser.getIdToken()
  } catch (error) {
    console.error('[Auth] Failed to get ID token:', error)
    return null
  }
}

// Get the user ID from Firebase user
export function getUserId() {
  return currentUser?.uid || null
}

// Register callback for when Google OAuth access token is received
// (called after the "Connect YouTube" redirect returns with the YouTube scope)
export function onOAuthToken(callback) {
  onOAuthTokenCallback = callback
}

// Register callback for a sign-in error that only shows up after the redirect returns
export function onRedirectError(callback) {
  onRedirectErrorCallback = callback
}

export default authClient
