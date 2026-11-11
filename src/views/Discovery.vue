<script setup>
import { ref, computed, onMounted } from 'vue'
import { useLibraryStore } from '../stores/library'
import { api } from '../services/api'
import SongCard from '../components/SongCard.vue'

const library = useLibraryStore()

// --- Automatic tagging (genres/moods from Last.fm tags) ---
// Nothing called the tagger since Jan 2026, so Discover stayed empty unless
// every song was tagged by hand. One click now works through the library in
// small server batches (each call stops after ~7 s) until nothing is left.
const MAX_ROUNDS = 60
const tagging = ref(false)
const tagProgress = ref({ done: 0, tagged: 0 })
const tagMessage = ref('')
const pendingTags = computed(() => library.enrichmentStatus?.metadata?.pending || 0)

async function autoTag() {
  if (tagging.value) return
  tagging.value = true
  tagMessage.value = ''
  tagProgress.value = { done: 0, tagged: 0 }
  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const result = await api.enrichSongs({ all: true })
      tagProgress.value = {
        done: tagProgress.value.done + (result.processed || 0),
        tagged: tagProgress.value.tagged + (result.enriched || 0)
      }
      if (!result.processed || (result.remaining?.metadata || 0) === 0) break
    }
    tagMessage.value = tagProgress.value.tagged > 0
      ? `Tagged ${tagProgress.value.tagged} songs. Songs Last.fm has no tags for can still get "+ add tags".`
      : "Last.fm had no genre or mood tags for these songs. You can still add them by hand."
  } catch (e) {
    tagMessage.value = "Tagging stopped early. Try again in a minute; nothing is lost."
  } finally {
    tagging.value = false
    await Promise.all([library.fetchSongs(), library.fetchEnrichmentStatus()])
  }
}

const selectedGenre = ref('all')
const selectedMood = ref('all')

// Fetch songs on mount
onMounted(() => {
  if (library.songs.length === 0) {
    library.fetchSongs()
  }
  library.fetchEnrichmentStatus()
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

    <!-- Automatic tagging -->
    <div
      v-if="pendingTags > 0 || tagging || tagMessage"
      class="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
      aria-live="polite"
    >
      <p class="text-sm text-zinc-300">
        <template v-if="tagging">Finding genres and moods… {{ tagProgress.done }} songs checked, {{ tagProgress.tagged }} tagged</template>
        <template v-else-if="tagMessage">{{ tagMessage }}</template>
        <template v-else><strong class="text-white">{{ pendingTags }}</strong> songs have no genre or mood yet. TuneCraft can look them up on Last.fm.</template>
      </p>
      <button
        v-if="pendingTags > 0 && !tagging"
        type="button"
        class="shrink-0 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        @click="autoTag"
      >
        Find genres and moods
      </button>
    </div>

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
        Use "+ add tags" on any song in your Library to give it a genre and a mood, and it shows up here.
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
