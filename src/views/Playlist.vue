<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const playlistId = ref(route.params.id)
</script>

<template>
  <div class="p-6 lg:p-8">
    <h1 class="text-2xl font-bold text-white mb-6">Playlist</h1>
    <p class="text-zinc-400">Playlist ID: {{ playlistId }}</p>

    <!-- Coming Soon -->
    <div class="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl mt-6">
      <span class="text-5xl mb-4 block">📋</span>
      <h3 class="text-xl font-semibold text-white mb-2">Playlist View Coming Soon</h3>
      <p class="text-zinc-400">
        Smart playlists will appear here once you have music imported.
      </p>
    </div>
  </div>
</template>
