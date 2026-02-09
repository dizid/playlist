<script setup>
import { onMounted, computed } from 'vue'
import { useLibraryStore } from '../stores/library'
import { useAuthStore } from '../stores/auth'

const library = useLibraryStore()
const auth = useAuthStore()

onMounted(async () => {
  await Promise.all([
    library.fetchSongs(),
    library.fetchPlaylists(),
    library.fetchEnrichmentStatus()
  ])
})

// --- Stats ---
const totalPlays = computed(() =>
  library.songs.reduce((sum, s) => sum + (s.play_count || 0), 0)
)

const enrichedCount = computed(() => library.enrichmentStatus.completed || 0)
const totalSongCount = computed(() => library.enrichmentStatus.total || library.songs.length)

const stats = computed(() => [
  { label: 'Songs', value: library.songCount, color: 'text-indigo-400' },
  { label: 'Playlists', value: library.playlists.length, color: 'text-indigo-400' },
  { label: 'Total Plays', value: totalPlays.value, color: 'text-indigo-400' },
  { label: 'Enriched', value: `${enrichedCount.value}/${totalSongCount.value}`, color: 'text-indigo-400' }
])

// --- Playlist previews (first 3) ---
const playlistPreviews = computed(() =>
  library.playlists.slice(0, 3)
)

// --- Library health insights ---
const songsNeedingGenres = computed(() =>
  library.songs.filter(s => !s.genres || s.genres.length === 0).length
)

const songsWithoutYouTube = computed(() =>
  library.songs.filter(s => s.youtube_id?.startsWith('shz')).length
)

const pendingEnrichment = computed(() =>
  library.enrichmentStatus.pending || 0
)

const hasInsights = computed(() =>
  songsNeedingGenres.value > 0 || songsWithoutYouTube.value > 0 || pendingEnrichment.value > 0
)

// --- Quick actions ---
const quickActions = [
  { label: 'Import Music', path: '/import' },
  { label: 'View Library', path: '/library' },
  { label: 'Create Playlist', path: '/library' }
]
</script>

<template>
  <div class="p-6 lg:p-8" role="main">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-white">
        Welcome back, {{ auth.userName?.split(' ')[0] || 'there' }}
      </h1>
      <p class="text-zinc-400 mt-1">Here's your music overview</p>
    </div>

    <!-- Loading State -->
    <div v-if="library.isLoading && library.songs.length === 0" class="space-y-6">
      <!-- Skeleton stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-zinc-800 rounded-lg"></div>
            <div class="space-y-2">
              <div class="h-6 w-12 bg-zinc-800 rounded"></div>
              <div class="h-3 w-16 bg-zinc-800 rounded"></div>
            </div>
          </div>
        </div>
      </div>
      <!-- Skeleton sections -->
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-pulse">
        <div class="h-5 w-32 bg-zinc-800 rounded mb-4"></div>
        <div class="space-y-3">
          <div class="h-12 bg-zinc-800 rounded"></div>
          <div class="h-12 bg-zinc-800 rounded"></div>
          <div class="h-12 bg-zinc-800 rounded"></div>
        </div>
      </div>
    </div>

    <!-- Main content (after loading) -->
    <template v-else>
      <!-- Stats Row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
        >
          <div class="flex items-center gap-3">
            <div :class="['w-10 h-10 rounded-lg flex items-center justify-center bg-zinc-800', stat.color]">
              <!-- Music note icon for Songs -->
              <svg v-if="stat.label === 'Songs'" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
              <!-- List icon for Playlists -->
              <svg v-else-if="stat.label === 'Playlists'" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              <!-- Play icon for Total Plays -->
              <svg v-else-if="stat.label === 'Total Plays'" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              <!-- Star icon for Enriched -->
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-white">{{ stat.value }}</p>
              <p class="text-xs text-zinc-500">{{ stat.label }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="mb-8">
        <h2 class="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <router-link
            v-for="action in quickActions"
            :key="action.label"
            :to="action.path"
            :aria-label="action.label"
            class="flex items-center gap-3 p-4 rounded-xl text-white transition-colors bg-indigo-600 hover:bg-indigo-700"
          >
            <!-- Import icon -->
            <svg v-if="action.label === 'Import Music'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <!-- Library icon -->
            <svg v-else-if="action.label === 'View Library'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
            <!-- Plus icon -->
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span class="font-medium">{{ action.label }}</span>
          </router-link>
        </div>
      </div>

      <!-- Your Playlists -->
      <div v-if="playlistPreviews.length > 0" class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-white">Your Playlists</h2>
          <router-link to="/library" class="text-sm text-indigo-400 hover:text-indigo-300">
            View all
          </router-link>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <router-link
            v-for="pl in playlistPreviews"
            :key="pl.id"
            :to="`/playlist/${pl.id}`"
            class="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors group"
          >
            <div class="flex items-center justify-between mb-2">
              <h3 class="font-medium text-white truncate group-hover:text-indigo-400 transition-colors">{{ pl.name }}</h3>
              <span
                :class="pl.type === 'smart' ? 'bg-indigo-600/20 text-indigo-400' : 'bg-zinc-700/50 text-zinc-400'"
                class="text-xs px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
              >
                {{ pl.type === 'smart' ? 'Smart' : 'Manual' }}
              </span>
            </div>
            <p class="text-sm text-zinc-500">
              {{ pl.song_ids?.length || pl.song_count || '—' }} songs
            </p>
          </router-link>
        </div>
      </div>

      <!-- Library Health -->
      <div v-if="hasInsights && library.songs.length > 0" class="mb-8">
        <h2 class="text-lg font-semibold text-white mb-4">Library Health</h2>
        <div class="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
          <div v-if="songsNeedingGenres > 0" class="flex items-center justify-between p-4">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-amber-600/20 text-amber-400 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
              </div>
              <span class="text-sm text-zinc-300">
                <strong class="text-white">{{ songsNeedingGenres }}</strong> songs need genre tags
              </span>
            </div>
            <router-link to="/discover" class="text-xs text-indigo-400 hover:text-indigo-300">
              Fix
            </router-link>
          </div>

          <div v-if="songsWithoutYouTube > 0" class="flex items-center justify-between p-4">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-red-600/20 text-red-400 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </div>
              <span class="text-sm text-zinc-300">
                <strong class="text-white">{{ songsWithoutYouTube }}</strong> songs have no YouTube link
              </span>
            </div>
            <router-link to="/library" class="text-xs text-indigo-400 hover:text-indigo-300">
              Review
            </router-link>
          </div>

          <div v-if="pendingEnrichment > 0" class="flex items-center justify-between p-4">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-purple-600/20 text-purple-400 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </div>
              <span class="text-sm text-zinc-300">
                <strong class="text-white">{{ pendingEnrichment }}</strong> songs ready to enrich
              </span>
            </div>
            <router-link to="/discover" class="text-xs text-indigo-400 hover:text-indigo-300">
              Enrich
            </router-link>
          </div>
        </div>
      </div>

      <!-- Top Songs Preview -->
      <div v-if="library.topSongs.length > 0">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-white">Your Top Songs</h2>
          <router-link to="/library" class="text-sm text-indigo-400 hover:text-indigo-300">
            View all
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
        v-if="library.songs.length === 0 && !library.isLoading"
        class="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 mx-auto text-zinc-600 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        <h3 class="text-xl font-semibold text-white mb-2">No music yet</h3>
        <p class="text-zinc-400 mb-6">Import your music to get started</p>
        <router-link
          to="/import"
          class="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Start Importing
        </router-link>
      </div>
    </template>
  </div>
</template>
