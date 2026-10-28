// Firebase app initialization
// Config uses VITE_ env vars (safe publishable keys)

import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth'

// On the live site, run the sign-in helper from our own domain (proxied to firebaseapp.com
// via /__/auth/* in netlify.toml). With the firebaseapp.com helper, browsers that partition
// third-party storage (Chrome, Safari, Firefox) send the user back signed out after Google.
// Needs https://tunecraft.music/__/auth/handler as an authorized redirect URI on the Google
// OAuth client. Localhost and Netlify preview URLs keep the default helper domain.
const PRODUCTION_HOST = 'tunecraft.music'
const isProductionHost = typeof window !== 'undefined' && window.location.hostname === PRODUCTION_HOST

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: isProductionHost ? PRODUCTION_HOST : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
// Request YouTube read access during Google sign-in (single login instead of two)
googleProvider.addScope('https://www.googleapis.com/auth/youtube.readonly')

export const githubProvider = new GithubAuthProvider()
