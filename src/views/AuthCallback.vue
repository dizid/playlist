<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const error = ref(null)

onMounted(async () => {
  // Extract token from URL query params (Neon Auth sends token in query)
  const urlParams = new URLSearchParams(window.location.search)
  const token = urlParams.get('token')

  // Also check hash params as fallback
  const hashParams = new URLSearchParams(window.location.hash.substring(1))
  const hashToken = hashParams.get('token') || hashParams.get('access_token')

  const authToken = token || hashToken

  if (authToken) {
    try {
      const success = await auth.handleAuthCallback(authToken)
      if (success) {
        // Clear URL params and redirect to dashboard
        window.history.replaceState({}, document.title, '/auth/callback')
        router.push('/dashboard')
      } else {
        error.value = 'Failed to authenticate. Please try again.'
      }
    } catch (e) {
      console.error('Auth callback error:', e)
      error.value = e.message || 'Authentication failed'
    }
  } else {
    error.value = 'No authentication token received'
  }
})
</script>

<template>
  <div class="min-h-screen bg-zinc-950 flex items-center justify-center">
    <div class="text-center">
      <div v-if="!error" class="space-y-4">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
        <p class="text-zinc-400">Completing sign in...</p>
      </div>

      <div v-else class="space-y-4">
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
