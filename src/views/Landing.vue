<script setup>
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'

const auth = useAuthStore()
const router = useRouter()

onMounted(() => {
  // Reset stale loading state (e.g. user navigated back after failed redirect)
  if (auth.isLoading && !auth.isAuthenticated) {
    auth.isLoading = false
  }
  if (auth.isAuthenticated) {
    router.push('/dashboard')
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col">

    <!-- Hero -->
    <div class="flex-1 flex flex-col items-center justify-center px-4 py-20 md:py-28 relative overflow-hidden" role="banner">
      <!-- Subtle background glow -->
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true"></div>

      <div class="text-center max-w-3xl mx-auto relative z-10 animate-fade-in-up">
        <!-- Logo -->
        <div class="flex items-center justify-center gap-3 mb-6">
          <span class="text-5xl">🎧</span>
          <h1 class="text-4xl md:text-5xl font-bold text-white">TuneCraft</h1>
        </div>

        <!-- Problem-first headline -->
        <h2 class="text-2xl md:text-4xl font-bold text-white leading-tight mb-4">
          Your music is scattered everywhere.
          <span class="text-indigo-400">Fix that.</span>
        </h2>

        <!-- Solution subtitle -->
        <p class="text-lg md:text-xl text-zinc-400 mb-4 max-w-2xl mx-auto">
          TuneCraft consolidates YouTube, Shazam, and Spotify into one smart library you actually own.
        </p>
        <p class="text-zinc-500 mb-10">
          Own your taste data. Smart playlists. Zero algorithm slop.
        </p>

        <!-- CTA Buttons (preserved exactly) -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            @click="auth.loginWithGoogle"
            :disabled="auth.isLoading"
            aria-label="Sign in with Google"
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
            aria-label="Sign in with GitHub"
            class="inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-medium text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50"
          >
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Sign in with GitHub
          </button>
        </div>

        <!-- Auth error message (preserved exactly) -->
        <div
          v-if="auth.error"
          class="mt-4 mx-auto max-w-md px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
          role="alert"
        >
          <p>{{ auth.error }}</p>
          <button
            @click="auth.clearError()"
            class="mt-1 text-red-500 underline hover:text-red-400 text-xs"
          >
            Dismiss
          </button>
        </div>

        <p class="mt-4 text-sm text-zinc-600">
          We import your music data for personal use only. Read-only access — no posting, no tracking.
        </p>
      </div>
    </div>

    <!-- How It Works -->
    <div class="border-t border-zinc-800 bg-zinc-900/30 py-16 md:py-20 px-4">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-2xl md:text-3xl font-bold text-white text-center mb-12 animate-fade-in-up animation-delay-1">
          How it works
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          <!-- Step 1: Import -->
          <div class="flex flex-col items-center text-center animate-fade-in-up animation-delay-2">
            <div class="w-12 h-12 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg mb-4">
              1
            </div>
            <div class="w-10 h-10 mb-3 text-zinc-300 flex items-center justify-center">
              <!-- Download/Import icon -->
              <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">Import</h3>
            <p class="text-sm text-zinc-400">Pull in your YouTube playlists, Shazam history, or Spotify library</p>
          </div>

          <!-- Step 2: Organize -->
          <div class="flex flex-col items-center text-center animate-fade-in-up animation-delay-3">
            <div class="w-12 h-12 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg mb-4">
              2
            </div>
            <div class="w-10 h-10 mb-3 text-zinc-300 flex items-center justify-center">
              <!-- Sparkles/Auto icon -->
              <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">Organize</h3>
            <p class="text-sm text-zinc-400">Auto-tag genres and moods. Smart playlists build themselves</p>
          </div>

          <!-- Step 3: Play -->
          <div class="flex flex-col items-center text-center animate-fade-in-up animation-delay-4">
            <div class="w-12 h-12 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg mb-4">
              3
            </div>
            <div class="w-10 h-10 mb-3 text-zinc-300 flex items-center justify-center">
              <!-- Play icon -->
              <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">Play</h3>
            <p class="text-sm text-zinc-400">One-click YouTube playback. Your taste, your rules</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Features -->
    <div class="border-t border-zinc-800 py-16 md:py-20 px-4" role="main">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-2xl md:text-3xl font-bold text-white text-center mb-12 animate-fade-in-up animation-delay-1">
          Everything you need
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Import from 4 sources -->
          <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-fade-in-up animation-delay-2">
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 rounded-lg bg-indigo-600/15 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-white mb-1">Import from 4 sources</h3>
                <p class="text-sm text-zinc-400 mb-3">YouTube playlists, Shazam history, Google Takeout, and Spotify exports all land in one library.</p>
                <div class="flex flex-wrap gap-2">
                  <span class="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">YouTube</span>
                  <span class="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">Shazam</span>
                  <span class="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">Google Takeout</span>
                  <span class="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">Spotify</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Auto-enrichment -->
          <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-fade-in-up animation-delay-3">
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 rounded-lg bg-indigo-600/15 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-white mb-1">Auto-enrichment</h3>
                <p class="text-sm text-zinc-400 mb-3">Genres and moods tagged automatically. Rate songs as loved, liked, or skip -- your taste profile builds itself.</p>
                <div class="flex gap-3 text-sm">
                  <span class="text-red-500">Loved</span>
                  <span class="text-green-500">Liked</span>
                  <span class="text-zinc-500">Skip</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Playlists that think -->
          <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-fade-in-up animation-delay-4">
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 rounded-lg bg-indigo-600/15 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-white mb-1">Playlists that think</h3>
                <p class="text-sm text-zinc-400 mb-3">Auto-generated smart playlists that update as your taste evolves. No more manual sorting.</p>
                <div class="flex flex-wrap gap-2">
                  <span class="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">Top 50</span>
                  <span class="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">Heavy Rotation</span>
                  <span class="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">Fresh Loves</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Rediscover your music -->
          <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-fade-in-up animation-delay-5">
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 rounded-lg bg-indigo-600/15 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-white mb-1">Rediscover your music</h3>
                <p class="text-sm text-zinc-400">Find forgotten favorites buried in your own library. Songs you loved years ago, surfaced when you need them.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="py-8 px-4 text-center border-t border-zinc-800">
      <p class="text-sm text-zinc-500 mb-1">Built for music lovers who own their data.</p>
      <p class="text-xs text-zinc-600">TuneCraft - Your taste, your data, your rules.</p>
    </footer>
  </div>
</template>

<style scoped>
/* Fade in + slide up animation */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out both;
}

/* Staggered delays for sequential reveal */
.animation-delay-1 {
  animation-delay: 0.1s;
}
.animation-delay-2 {
  animation-delay: 0.2s;
}
.animation-delay-3 {
  animation-delay: 0.3s;
}
.animation-delay-4 {
  animation-delay: 0.4s;
}
.animation-delay-5 {
  animation-delay: 0.5s;
}
</style>
