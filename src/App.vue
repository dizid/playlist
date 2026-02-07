<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import Navigation from './components/Navigation.vue'

const auth = useAuthStore()

onMounted(async () => {
  // Try to restore existing session from Neon Auth
  await auth.restoreSession()
})
</script>

<template>
  <div class="min-h-screen bg-zinc-950">
    <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg">Skip to content</a>
    <Navigation v-if="auth.isAuthenticated" />
    <main id="main-content" :class="{ 'lg:pl-64': auth.isAuthenticated }">
      <router-view />
    </main>
  </div>
</template>
