<script setup>
import { onMounted, computed } from 'vue'
import { useLibraryStore } from '../stores/library'
import { useAuthStore } from '../stores/auth'

const library = useLibraryStore()
const auth = useAuthStore()

onMounted(() => {
  library.fetchSongs()
  library.fetchPlaylists()
})

const stats = computed(() => [
  { label: 'Songs', value: library.songCount, icon: '🎵' },
  { label: 'Playlists', value: library.playlists.length, icon: '📋' }
])

const quickActions = [
  { label: 'Import Music', path: '/import', icon: '📥', color: 'bg-indigo-600' },
  { label: 'Discover', path: '/discover', icon: '🔮', color: 'bg-purple-600' },
  { label: 'View Library', path: '/library', icon: '🎵', color: 'bg-emerald-600' }
]
</script>

<template>
  <div class="p-6 lg:p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-white">
        Welcome back, {{ auth.userName?.split(' ')[0] || 'there' }}! 👋
      </h1>
      <p class="text-zinc-400 mt-1">Here's your music overview</p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
      >
        <div class="flex items-center gap-4">
          <span class="text-3xl">{{ stat.icon }}</span>
          <div>
            <p class="text-3xl font-bold text-white">{{ stat.value }}</p>
            <p class="text-sm text-zinc-500">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="mb-8">
      <h2 class="text-lg font-semibold text-white mb-4">Quick Actions</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <router-link
          v-for="action in quickActions"
          :key="action.path"
          :to="action.path"
          :class="action.color"
          class="flex items-center gap-3 p-4 rounded-xl text-white hover:opacity-90 transition-opacity"
        >
          <span class="text-2xl">{{ action.icon }}</span>
          <span class="font-medium">{{ action.label }}</span>
        </router-link>
      </div>
    </div>

    <!-- Top Songs Preview -->
    <div v-if="library.topSongs.length > 0">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-white">Your Top Songs</h2>
        <router-link to="/library" class="text-sm text-indigo-400 hover:text-indigo-300">
          View all →
        </router-link>
      </div>
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
        <div
          v-for="(song, index) in library.topSongs.slice(0, 5)"
          :key="song.id"
          class="flex items-center gap-4 p-4"
        >
          <span class="w-6 text-center text-zinc-500 font-medium">{{ index + 1 }}</span>
          <img
            v-if="song.thumbnail"
            :src="song.thumbnail"
            :alt="song.title"
            class="w-12 h-12 rounded object-cover"
          />
          <div class="flex-1 min-w-0">
            <p class="font-medium text-white truncate">{{ song.title }}</p>
            <p class="text-sm text-zinc-500 truncate">{{ song.artist || song.channel }}</p>
          </div>
          <span class="text-sm text-zinc-500">{{ song.play_count }} plays</span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!library.isLoading"
      class="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl"
    >
      <span class="text-5xl mb-4 block">🎵</span>
      <h3 class="text-xl font-semibold text-white mb-2">No music yet</h3>
      <p class="text-zinc-400 mb-6">Import your music to get started</p>
      <router-link
        to="/import"
        class="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        <span>📥</span>
        Start Importing
      </router-link>
    </div>

    <!-- Loading State -->
    <div v-if="library.isLoading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
    </div>
  </div>
</template>
