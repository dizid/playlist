<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../services/api'
import SongCard from '../components/SongCard.vue'

const route = useRoute()
const router = useRouter()

const playlist = ref(null)
const songs = ref([])
const totalSongs = ref(0)
const isLoading = ref(true)
const error = ref(null)
const noPlayableSongs = ref(false)

// Active rules as displayable chips
const activeRules = computed(() => {
  if (!playlist.value?.rules) return []
  const rules = playlist.value.rules
  const chips = []

  if (typeof rules.minPopularity === 'number') {
    chips.push({ label: 'Popularity', value: `>= ${rules.minPopularity}%` })
  }
  if (Array.isArray(rules.genres) && rules.genres.length) {
    chips.push({ label: 'Genres', value: rules.genres.join(', ') })
  }
  if (Array.isArray(rules.moods) && rules.moods.length) {
    chips.push({ label: 'Moods', value: rules.moods.join(', ') })
  }
  if (typeof rules.minPlayCount === 'number') {
    chips.push({ label: 'Plays', value: `>= ${rules.minPlayCount}` })
  }
  if (rules.sortBy) {
    const dir = rules.sortOrder === 'asc' ? 'ascending' : 'descending'
    chips.push({ label: 'Sort', value: `${rules.sortBy} ${dir}` })
  }
  if (rules.limit) {
    chips.push({ label: 'Limit', value: `${rules.limit} songs` })
  }

  return chips
})

onMounted(async () => {
  await loadPlaylist()
})

async function loadPlaylist() {
  isLoading.value = true
  error.value = null

  try {
    const data = await api.getPlaylist(route.params.id)
    playlist.value = data.playlist
    songs.value = data.songs
    totalSongs.value = data.totalSongs
  } catch (e) {
    error.value = e.message || 'Failed to load playlist'
  } finally {
    isLoading.value = false
  }
}

function playAll() {
  // Find the first song with a valid YouTube link
  const playable = songs.value.find(s =>
    s.youtube_id && !s.youtube_id.startsWith('shz') && s.youtube_status !== 'not_found'
  )
  if (playable) {
    window.open(`https://www.youtube.com/watch?v=${playable.youtube_id}`, '_blank')
    noPlayableSongs.value = false
  } else {
    noPlayableSongs.value = true
  }
}

function goBack() {
  router.back()
}
</script>

<template>
  <div class="p-6 lg:p-8 max-w-4xl">
    <!-- Back button -->
    <button
      @click="goBack"
      class="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>

    <!-- Loading state -->
    <div v-if="isLoading" class="space-y-4">
      <div class="h-8 w-48 bg-zinc-800 rounded animate-pulse"></div>
      <div class="h-5 w-32 bg-zinc-800 rounded animate-pulse"></div>
      <div class="space-y-3 mt-8">
        <div v-for="i in 5" :key="i" class="h-20 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse"></div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl" role="alert">
      <svg class="w-12 h-12 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 class="text-xl font-semibold text-white mb-2">Failed to Load Playlist</h3>
      <p class="text-zinc-400 text-sm mb-4">{{ error }}</p>
      <button
        @click="loadPlaylist"
        class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Retry
      </button>
    </div>

    <!-- Playlist content -->
    <div v-else-if="playlist">
      <!-- Header -->
      <div class="flex items-start justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <h1 class="text-2xl font-bold text-white">{{ playlist.name }}</h1>
            <span
              :class="[
                'px-2 py-0.5 rounded text-xs font-medium',
                playlist.type === 'smart'
                  ? 'bg-indigo-600/20 text-indigo-400'
                  : 'bg-zinc-700/50 text-zinc-300'
              ]"
            >
              {{ playlist.type === 'smart' ? 'Smart' : 'Manual' }}
            </span>
          </div>
          <p class="text-zinc-400 text-sm">{{ totalSongs }} {{ totalSongs === 1 ? 'song' : 'songs' }}</p>
        </div>

        <!-- Play All button -->
        <div v-if="songs.length > 0" class="flex flex-col items-end gap-2">
          <button
            @click="playAll"
            class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Play All
          </button>
          <p v-if="noPlayableSongs" class="text-sm text-amber-400">No playable songs with YouTube links</p>
        </div>
      </div>

      <!-- Smart playlist rule chips -->
      <div v-if="playlist.type === 'smart' && activeRules.length > 0" class="flex flex-wrap gap-2 mb-6">
        <div
          v-for="rule in activeRules"
          :key="rule.label"
          class="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-sm"
        >
          <span class="text-zinc-400">{{ rule.label }}:</span>
          <span class="text-white ml-1">{{ rule.value }}</span>
        </div>
      </div>

      <!-- Song list -->
      <div v-if="songs.length > 0" class="space-y-3">
        <SongCard v-for="song in songs" :key="song.id" :song="song" />
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl">
        <svg class="w-12 h-12 mx-auto text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        <h3 class="text-xl font-semibold text-white mb-2">No Songs Found</h3>
        <p class="text-zinc-400 text-sm">
          <template v-if="playlist.type === 'smart'">
            No songs match these playlist rules yet. Import more music or adjust the rules.
          </template>
          <template v-else>
            This playlist is empty. Add songs from your library.
          </template>
        </p>
        <router-link
          to="/library"
          class="inline-block mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Go to Library
        </router-link>
      </div>
    </div>
  </div>
</template>
