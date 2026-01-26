<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const error = ref(null)

onMounted(() => {
  // Check for OAuth error in URL params (Google returns errors here on redirect_uri_mismatch, etc.)
  const urlParams = new URLSearchParams(window.location.search)
  const oauthError = urlParams.get('error')
  const oauthErrorDesc = urlParams.get('error_description')

  if (oauthError) {
    error.value = `YouTube OAuth error: ${oauthError}${oauthErrorDesc ? ` - ${oauthErrorDesc}` : ''}`
    return
  }

  // YouTube OAuth returns token in URL hash (implicit grant flow)
  const success = auth.handleYouTubeCallback()

  if (success) {
    // Redirect back to import page
    router.push('/import')
  } else {
    error.value = 'Failed to connect YouTube. Please try again.'
  }
})
</script>

<template>
  <div class="min-h-screen bg-zinc-950 flex items-center justify-center">
    <div class="text-center">
      <div v-if="!error" class="space-y-4">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
        <p class="text-zinc-400">Connecting YouTube...</p>
      </div>

      <div v-else class="space-y-4">
        <span class="text-5xl">⚠️</span>
        <h2 class="text-xl font-semibold text-white">Connection Error</h2>
        <p class="text-zinc-400">{{ error }}</p>
        <router-link
          to="/import"
          class="inline-block px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </router-link>
      </div>
    </div>
  </div>
</template>
