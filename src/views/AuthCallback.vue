<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const error = ref(null)
const isLoading = ref(true)

onMounted(async () => {
  try {
    // Check for OAuth error in URL params (Google returns errors here on redirect_uri_mismatch, etc.)
    const urlParams = new URLSearchParams(window.location.search)
    const oauthError = urlParams.get('error')
    const oauthErrorDesc = urlParams.get('error_description')

    if (oauthError) {
      error.value = `OAuth error: ${oauthError}${oauthErrorDesc ? ` - ${oauthErrorDesc}` : ''}`
      isLoading.value = false
      return
    }

    // Neon Auth establishes session via HTTP-only cookie during OAuth flow
    // The neon_auth_session_verifier in URL is a PKCE parameter (handled by SDK)
    // Just call restoreSession() to get the user data from the cookie-based session
    const success = await auth.restoreSession()

    if (success) {
      // Clear URL params and redirect to dashboard
      window.history.replaceState({}, document.title, '/auth/callback')
      router.push('/dashboard')
    } else {
      error.value = 'Authentication failed. Please try again.'
    }
  } catch (e) {
    console.error('Auth callback error:', e)
    error.value = e.message || 'Authentication failed'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-zinc-950 flex items-center justify-center">
    <div class="text-center">
      <div v-if="isLoading && !error" class="space-y-4">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
        <p class="text-zinc-400">Completing sign in...</p>
      </div>

      <div v-else-if="error" class="space-y-4">
        <span class="text-5xl">⚠️</span>
        <h2 class="text-xl font-semibold text-white">Authentication Error</h2>
        <p class="text-zinc-400">{{ error }}</p>
        <router-link
          to="/"
          class="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Try Again
        </router-link>
      </div>
    </div>
  </div>
</template>
