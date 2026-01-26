<script setup>
import { ref, computed, onMounted } from 'vue'
import { useLibraryStore } from '../stores/library'
import SongCard from '../components/SongCard.vue'

const library = useLibraryStore()
const searchQuery = ref('')

onMounted(() => {
  library.fetchSongs()
})

const filteredSongs = computed(() => {
  let songs = library.songs

  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    songs = songs.filter(s =>
      s.title?.toLowerCase().includes(query) ||
      s.artist?.toLowerCase().includes(query) ||
      s.channel?.toLowerCase().includes(query)
    )
  }

  return songs
})
</script>

<template>
  <div class="p-6 lg:p-8">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">Library</h1>
        <p class="text-zinc-400">{{ library.songCount }} songs</p>
      </div>

      <!-- Search -->
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search songs..."
        class="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
      />
    </div>

    <!-- Songs List -->
    <div v-if="filteredSongs.length > 0" class="space-y-2">
      <SongCard
        v-for="song in filteredSongs"
        :key="song.id"
        :song="song"
      />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!library.isLoading"
      class="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl"
    >
      <span class="text-5xl mb-4 block">🔍</span>
      <h3 class="text-xl font-semibold text-white mb-2">
        {{ searchQuery ? 'No songs found' : 'Your library is empty' }}
      </h3>
      <p class="text-zinc-400">
        {{ searchQuery ? 'Try a different search' : 'Import some music to get started' }}
      </p>
    </div>

    <!-- Loading -->
    <div v-if="library.isLoading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
    </div>
  </div>
</template>
