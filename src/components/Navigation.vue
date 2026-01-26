<script setup>
import { useAuthStore } from '../stores/auth'
import { useLibraryStore } from '../stores/library'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const library = useLibraryStore()
const router = useRouter()

function handleLogout() {
  auth.logout()
  router.push('/')
}

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: '📊' },
  { name: 'Library', path: '/library', icon: '🎵' },
  { name: 'Import', path: '/import', icon: '📥' },
  { name: 'Discover', path: '/discover', icon: '🔮' },
  { name: 'Settings', path: '/settings', icon: '⚙️' }
]
</script>

<template>
  <aside class="fixed inset-y-0 left-0 z-50 hidden w-64 bg-zinc-900 border-r border-zinc-800 lg:block">
    <div class="flex flex-col h-full">
      <!-- Logo -->
      <div class="flex items-center gap-2 px-6 py-5 border-b border-zinc-800">
        <span class="text-2xl">🎧</span>
        <span class="text-xl font-bold text-white">TuneCraft</span>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-3 py-4 space-y-1">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
          :class="$route.path === item.path
            ? 'bg-indigo-600 text-white'
            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'"
        >
          <span>{{ item.icon }}</span>
          {{ item.name }}
        </router-link>
      </nav>

      <!-- User section -->
      <div class="p-4 border-t border-zinc-800">
        <div class="flex items-center gap-3">
          <img
            v-if="auth.userPicture"
            :src="auth.userPicture"
            :alt="auth.userName"
            class="w-10 h-10 rounded-full"
          />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">{{ auth.userName }}</p>
            <p class="text-xs text-zinc-500 truncate">{{ auth.userEmail }}</p>
          </div>
        </div>
        <button
          @click="handleLogout"
          class="w-full mt-3 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  </aside>

  <!-- Mobile header -->
  <header class="sticky top-0 z-40 flex items-center gap-4 px-4 py-3 bg-zinc-900 border-b border-zinc-800 lg:hidden">
    <span class="text-xl">🎧</span>
    <span class="font-bold text-white">TuneCraft</span>
  </header>
</template>
