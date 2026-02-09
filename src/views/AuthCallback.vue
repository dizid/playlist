<script setup>
import { onMounted, ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const error = ref(null)
const isLoading = ref(true)

// Timeout: show error if session restore takes too long
const CALLBACK_TIMEOUT_MS = 15_000
let timeoutId = null

onMounted(async () => {
  timeoutId = setTimeout(() => {
    if (isLoading.value) {
      error.value = 'Sign-in is taking too long. Please try again.'
      isLoading.value = false
    }
  }, CALLBACK_TIMEOUT_MS)

  await attemptSessionRestore()
})

onUnmounted(() => {
  if (timeoutId) clearTimeout(timeoutId)
})

async function attemptSessionRestore() {
  try {
    // Check for OAuth error in URL params
    const urlParams = new URLSearchParams(window.location.search)
    const oauthError = urlParams.get('error')
    const oauthErrorDesc = urlParams.get('error_description')

    if (oauthError) {
      error.value = `OAuth error: ${oauthError}${oauthErrorDesc ? ` - ${oauthErrorDesc}` : ''}`
      isLoading.value = false
      return
    }

    // Neon Auth establishes session via HTTP-only cookie during OAuth flow
    const success = await auth.restoreSession()

    if (success) {
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
}

function goToLanding() {
  if (error.value) auth.error = error.value
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-zinc-950 flex items-center justify-center">
    <div class="text-center max-w-sm px-4">
      <div v-if="isLoading && !error" class="space-y-4">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
        <p class="text-zinc-400">Completing sign in...</p>
      </div>

      <div v-else-if="error" class="space-y-4" role="alert">
        <div class="text-5xl">&#x26A0;&#xFE0F;</div>
        <h2 class="text-xl font-semibold text-white">Authentication Error</h2>
        <p class="text-zinc-400 text-sm">{{ error }}</p>
        <div class="flex flex-col gap-3 pt-2">
          <button
            @click="error = null; isLoading = true; attemptSessionRestore()"
            class="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
          <button
            @click="goToLanding"
            class="px-6 py-3 text-zinc-400 hover:text-white transition-colors"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
