<script setup>
import { ref, computed, onMounted } from 'vue'
import { useLibraryStore } from '../stores/library'
import SongCard from '../components/SongCard.vue'

const library = useLibraryStore()

const selectedGenre = ref('all')
const selectedMood = ref('all')

// Fetch songs on mount
onMounted(() => {
  if (library.songs.length === 0) {
    library.fetchSongs()
  }
})

// Dynamic genre options from library
const genreOptions = computed(() => {
  return ['all', ...library.availableGenres]
})

// Dynamic mood options from library
const moodOptions = computed(() => {
  return ['all', ...library.availableMoods]
})

// Filter songs based on selection
const filteredSongs = computed(() => {
  return library.songs.filter(song => {
    // Filter by genre
    if (selectedGenre.value !== 'all') {
      if (!song.genres?.includes(selectedGenre.value)) {
        return false
      }
    }
    // Filter by mood
    if (selectedMood.value !== 'all') {
      if (!song.moods?.includes(selectedMood.value)) {
        return false
      }
    }
    return true
  })
})

// Songs with tags (for stats)
const taggedSongsCount = computed(() => {
  return library.songs.filter(s => s.genres?.length || s.moods?.length).length
})

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function clearFilters() {
  selectedGenre.value = 'all'
  selectedMood.value = 'all'
}
</script>

<template>
  <div class="p-6 lg:p-8" role="main">
    <h1 class="text-2xl font-bold text-white mb-2">Discover</h1>
    <p class="text-zinc-400 mb-6">Filter your library by genre and mood</p>

    <!-- Filters -->
    <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-white">Filter by taste</h3>
        <span class="text-sm text-zinc-500">
          {{ taggedSongsCount }} / {{ library.songCount }} songs tagged
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-zinc-400 mb-2">Genre</label>
          <select
            v-model="selectedGenre"
            class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
          >
            <option v-for="genre in genreOptions" :key="genre" :value="genre">
              {{ genre === 'all' ? 'All genres' : capitalize(genre) }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-zinc-400 mb-2">Mood</label>
          <select
            v-model="selectedMood"
            class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
          >
            <option v-for="mood in moodOptions" :key="mood" :value="mood">
              {{ mood === 'all' ? 'All moods' : capitalize(mood) }}
            </option>
          </select>
        </div>
      </div>

      <div class="flex items-center gap-4 mt-4">
        <button
          v-if="selectedGenre !== 'all' || selectedMood !== 'all'"
          @click="clearFilters"
          aria-label="Clear all filters"
          class="text-sm text-zinc-400 hover:text-white"
        >
          Clear filters
        </button>
        <span class="text-sm text-zinc-500">
          {{ filteredSongs.length }} songs match
        </span>
      </div>
    </div>

    <!-- Empty State: No songs -->
    <div
      v-if="library.songCount === 0"
      class="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl"
    >
      <span class="text-5xl mb-4 block">📭</span>
      <h3 class="text-xl font-semibold text-white mb-2">No songs yet</h3>
      <p class="text-zinc-400 mb-4">Import some music first to discover by genre and mood</p>
      <router-link
        to="/import"
        class="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Import Music
      </router-link>
    </div>

    <!-- Empty State: No tagged songs -->
    <div
      v-else-if="taggedSongsCount === 0"
      class="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl"
    >
      <span class="text-5xl mb-4 block">🏷️</span>
      <h3 class="text-xl font-semibold text-white mb-2">No songs tagged yet</h3>
      <p class="text-zinc-400 mb-4">
        Re-import your music to enrich with genre and mood data, or manually tag songs in your library.
      </p>
      <router-link
        to="/library"
        class="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Go to Library
      </router-link>
    </div>

    <!-- Empty State: No matches -->
    <div
      v-else-if="filteredSongs.length === 0"
      class="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl"
    >
      <span class="text-5xl mb-4 block">🔍</span>
      <h3 class="text-xl font-semibold text-white mb-2">No songs match</h3>
      <p class="text-zinc-400">
        Try a different genre or mood combination
      </p>
    </div>

    <!-- Filtered Songs List -->
    <div v-else class="space-y-3" aria-live="polite">
      <SongCard
        v-for="song in filteredSongs"
        :key="song.id"
        :song="song"
      />
    </div>
  </div>
</template>
