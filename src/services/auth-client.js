// Firebase Auth client service
// Replaces Neon Auth — client-side only, no proxy needed.
// Firebase handles session persistence automatically via IndexedDB.

import { signInWithRedirect, getRedirectResult, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth'
import { auth, googleProvider, githubProvider } from './firebase'

// In-memory cache of current Firebase user
let currentUser = null

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

  // Check for redirect result (fires after signInWithRedirect returns)
  getRedirectResult(auth).catch((error) => {
    if (error?.code && error.code !== 'auth/popup-closed-by-user') {
      console.error('[Auth] Redirect result error:', error.code, error.message)
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
        const authProvider = provider === 'github' ? githubProvider : googleProvider
        // This navigates away from the page — on return, onAuthStateChanged fires
        await signInWithRedirect(auth, authProvider)
      } catch (error) {
        const message = extractErrorMessage(error)
        console.error('[Auth] signIn.social error:', message)
        throw new Error(message)
      }
    }
  },

  // Sign out
  async signOut() {
    try {
      await signOut(auth)
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
    return 'An account already exists with this email using a different sign-in method.'
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

export default authClient
