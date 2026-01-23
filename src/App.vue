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
    <Navigation v-if="auth.isAuthenticated" />
    <main :class="{ 'lg:pl-64': auth.isAuthenticated }">
      <router-view />
    </main>
  </div>
</template>
