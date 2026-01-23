<script setup>
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'

const auth = useAuthStore()
const router = useRouter()

onMounted(() => {
  if (auth.isAuthenticated) {
    router.push('/dashboard')
  }
})

const features = [
  {
    icon: '📥',
    title: 'Import Everything',
    description: 'Shazam, YouTube playlists, Google Takeout - all in one place'
  },
  {
    icon: '❤️',
    title: 'Rate & Organize',
    description: 'Love, Like, or Skip. Your taste, your rules.'
  },
  {
    icon: '🔥',
    title: 'Smart Playlists',
    description: 'Auto-generated Top 50, Heavy Rotation, Rediscoveries'
  },
  {
    icon: '🔮',
    title: 'Discover New Music',
    description: 'AI-powered recommendations based on YOUR taste'
  }
]
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Hero -->
    <div class="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <div class="text-center max-w-2xl mx-auto">
        <!-- Logo -->
        <div class="flex items-center justify-center gap-3 mb-8">
          <span class="text-5xl">🎧</span>
          <h1 class="text-4xl md:text-5xl font-bold text-white">TuneLayer</h1>
        </div>

        <!-- Tagline -->
        <p class="text-xl md:text-2xl text-zinc-400 mb-4">
          Your music layer on top of YouTube
        </p>
        <p class="text-zinc-500 mb-8">
          Own your taste data. Smart playlists. Zero algorithm slop.
        </p>

        <!-- CTA Buttons -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            @click="auth.loginWithGoogle"
            :disabled="auth.isLoading"
            class="inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50"
          >
            <svg class="w-6 h-6" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>

          <button
            @click="auth.loginWithGithub"
            :disabled="auth.isLoading"
            class="inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-medium text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50"
          >
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Sign in with GitHub
          </button>
        </div>

        <p class="mt-4 text-sm text-zinc-600">
          We only access your YouTube playlists. No posting, no tracking.
        </p>
      </div>
    </div>

    <!-- Features -->
    <div class="border-t border-zinc-800 bg-zinc-900/50 py-16 px-4">
      <div class="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <div v-for="feature in features" :key="feature.title" class="flex gap-4">
          <span class="text-3xl">{{ feature.icon }}</span>
          <div>
            <h3 class="font-semibold text-white">{{ feature.title }}</h3>
            <p class="text-sm text-zinc-400">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="py-6 px-4 text-center text-sm text-zinc-600 border-t border-zinc-800">
      <p>TuneLayer - Your taste, your data, your rules.</p>
    </footer>
  </div>
</template>
