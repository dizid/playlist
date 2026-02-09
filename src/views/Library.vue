<script setup>
import { ref, computed, onMounted } from 'vue'
import { useLibraryStore } from '../stores/library'
import SongCard from '../components/SongCard.vue'

const library = useLibraryStore()
const searchQuery = ref('')

// Sort & filter state
const sortBy = ref('created_at_desc')
const selectedGenres = ref([])
const selectedMoods = ref([])
const showFilters = ref(false)

const sortOptions = [
  { value: 'created_at_desc', label: 'Recently Added' },
  { value: 'play_count_desc', label: 'Most Played' },
  { value: 'title_asc', label: 'A-Z' },
  { value: 'popularity_desc', label: 'Popularity' }
]

// Count of active filters (genres + moods, not counting sort)
const activeFilterCount = computed(() =>
  selectedGenres.value.length + selectedMoods.value.length
)

function toggleGenre(genre) {
  const idx = selectedGenres.value.indexOf(genre)
  if (idx >= 0) {
    selectedGenres.value.splice(idx, 1)
  } else {
    selectedGenres.value.push(genre)
  }
}

function toggleMood(mood) {
  const idx = selectedMoods.value.indexOf(mood)
  if (idx >= 0) {
    selectedMoods.value.splice(idx, 1)
  } else {
    selectedMoods.value.push(mood)
  }
}

function clearFilters() {
  selectedGenres.value = []
  selectedMoods.value = []
  sortBy.value = 'created_at_desc'
}

// Sort function based on selected sort option
function getSortFn(key) {
  switch (key) {
    case 'play_count_desc':
      return (a, b) => (b.play_count || 0) - (a.play_count || 0)
    case 'title_asc':
      return (a, b) => (a.title || '').localeCompare(b.title || '')
    case 'popularity_desc':
      return (a, b) => (b.popularity || 0) - (a.popularity || 0)
    case 'created_at_desc':
    default:
      return (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  }
}

onMounted(async () => {
  await library.fetchSongs()
})

const filteredSongs = computed(() => {
  let songs = library.songs

  // 1. Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    songs = songs.filter(s =>
      s.title?.toLowerCase().includes(query) ||
      s.artist?.toLowerCase().includes(query) ||
      s.channel?.toLowerCase().includes(query)
    )
  }

  // 2. Genre filter
  if (selectedGenres.value.length) {
    songs = songs.filter(s =>
      s.genres?.some(g => selectedGenres.value.includes(g))
    )
  }

  // 3. Mood filter
  if (selectedMoods.value.length) {
    songs = songs.filter(s =>
      s.moods?.some(m => selectedMoods.value.includes(m))
    )
  }

  // 4. Sort
  songs = [...songs].sort(getSortFn(sortBy.value))

  return songs
})
</script>

<template>
  <div class="p-6 lg:p-8" role="main">
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
        aria-label="Search songs"
        class="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
      />
    </div>

    <!-- Sort & Filter Bar -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <!-- Sort dropdown -->
      <select
        v-model="sortBy"
        aria-label="Sort songs"
        class="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
      >
        <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>

      <!-- Filters toggle button -->
      <button
        @click="showFilters = !showFilters"
        class="relative px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white hover:border-zinc-600 focus:outline-none focus:border-indigo-500 cursor-pointer"
        :class="{ 'border-indigo-500': showFilters || activeFilterCount > 0 }"
        aria-label="Toggle filters"
      >
        Filters
        <span
          v-if="activeFilterCount > 0"
          class="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs font-semibold bg-indigo-600 text-white rounded-full"
        >
          {{ activeFilterCount }}
        </span>
      </button>

      <!-- Clear all (shown when filters are active) -->
      <button
        v-if="activeFilterCount > 0"
        @click="clearFilters"
        class="px-3 py-2 text-sm text-zinc-400 hover:text-white focus:outline-none cursor-pointer"
        aria-label="Clear all filters"
      >
        Clear all
      </button>

      <!-- Result count when filtering -->
      <span
        v-if="searchQuery || activeFilterCount > 0"
        class="ml-auto text-sm text-zinc-500"
        aria-live="polite"
      >
        Showing {{ filteredSongs.length }} of {{ library.songs.length }} songs
      </span>
    </div>

    <!-- Expanded filter panel -->
    <div
      v-if="showFilters"
      class="mb-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4"
    >
      <!-- Genres -->
      <div v-if="library.availableGenres.length">
        <h3 class="text-sm font-medium text-zinc-400 mb-2">Genres</h3>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="genre in library.availableGenres"
            :key="genre"
            @click="toggleGenre(genre)"
            class="px-3 py-1 rounded-full text-sm border cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
            :class="selectedGenres.includes(genre)
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-600'"
            :aria-pressed="selectedGenres.includes(genre)"
          >
            {{ genre }}
          </button>
        </div>
      </div>

      <!-- Moods -->
      <div v-if="library.availableMoods.length">
        <h3 class="text-sm font-medium text-zinc-400 mb-2">Moods</h3>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="mood in library.availableMoods"
            :key="mood"
            @click="toggleMood(mood)"
            class="px-3 py-1 rounded-full text-sm border cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
            :class="selectedMoods.includes(mood)
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-600'"
            :aria-pressed="selectedMoods.includes(mood)"
          >
            {{ mood }}
          </button>
        </div>
      </div>

      <!-- No genres/moods available -->
      <p
        v-if="!library.availableGenres.length && !library.availableMoods.length"
        class="text-sm text-zinc-500"
      >
        No genres or moods tagged yet. Enrich your songs to enable filtering.
      </p>
    </div>

    <!-- Loading skeleton (first load) -->
    <div v-if="library.isLoading && library.songs.length === 0" class="space-y-3">
      <div v-for="i in 5" :key="i" class="h-20 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse"></div>
    </div>

    <!-- Songs List -->
    <div v-if="filteredSongs.length > 0" class="space-y-2" aria-live="polite">
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
        {{ searchQuery || activeFilterCount > 0 ? 'No songs found' : 'Your library is empty' }}
      </h3>
      <p class="text-zinc-400">
        {{ searchQuery || activeFilterCount > 0 ? 'Try adjusting your search or filters' : 'Import some music to get started' }}
      </p>
    </div>

    <!-- Load More -->
    <div v-if="library.pagination.page < library.pagination.totalPages && !library.isLoading" class="flex justify-center py-6">
      <button
        @click="library.loadMore()"
        class="px-6 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-lg hover:border-zinc-600 transition-colors"
      >
        Load more ({{ library.pagination.total - library.songs.length }} remaining)
      </button>
    </div>

    <!-- Loading -->
    <div v-if="library.isLoading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
    </div>
  </div>
</template>
