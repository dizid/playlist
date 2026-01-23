<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useLibraryStore } from '../stores/library'

const auth = useAuthStore()
const library = useLibraryStore()

const activeTab = ref('youtube')
const isImporting = ref(false)
const importProgress = ref({ current: 0, total: 0, message: '' })
const importResults = ref(null)

const tabs = [
  { id: 'youtube', label: 'YouTube', icon: '📺' },
  { id: 'shazam', label: 'Shazam', icon: '🎤' },
  { id: 'takeout', label: 'Google Takeout', icon: '📦' }
]

// Check if YouTube is connected
const needsYouTubeConnection = computed(() => !auth.hasYouTubeAccess)

async function importYouTubePlaylists() {
  if (!auth.youtubeToken) {
    auth.connectYouTube()
    return
  }

  isImporting.value = true
  importProgress.value = { current: 0, total: 0, message: 'Fetching playlists...' }
  importResults.value = null

  try {
    // Fetch user's playlists
    const playlistsResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50',
      { headers: { Authorization: `Bearer ${auth.youtubeToken}` } }
    )

    if (!playlistsResponse.ok) {
      if (playlistsResponse.status === 401) {
        auth.disconnectYouTube()
        throw new Error('YouTube token expired. Please reconnect.')
      }
      throw new Error('Failed to fetch playlists')
    }

    const playlistsData = await playlistsResponse.json()
    const playlists = playlistsData.items || []

    let totalImported = 0
    let totalSkipped = 0

    // Process each playlist
    for (let i = 0; i < playlists.length; i++) {
      const playlist = playlists[i]
      importProgress.value = {
        current: i + 1,
        total: playlists.length,
        message: `Processing: ${playlist.snippet.title}`
      }

      // Fetch playlist items
      let nextPageToken = null
      do {
        const itemsUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems')
        itemsUrl.searchParams.set('part', 'snippet')
        itemsUrl.searchParams.set('playlistId', playlist.id)
        itemsUrl.searchParams.set('maxResults', '50')
        if (nextPageToken) {
          itemsUrl.searchParams.set('pageToken', nextPageToken)
        }

        const itemsResponse = await fetch(itemsUrl, {
          headers: { Authorization: `Bearer ${auth.youtubeToken}` }
        })

        if (!itemsResponse.ok) continue

        const itemsData = await itemsResponse.json()
        const items = itemsData.items || []

        // Import each video as a song
        for (const item of items) {
          try {
            const videoId = item.snippet?.resourceId?.videoId
            if (!videoId) continue

            // Parse artist from title (common format: "Artist - Song Title")
            const title = item.snippet.title || 'Unknown'
            let artist = null
            let songTitle = title

            if (title.includes(' - ')) {
              const parts = title.split(' - ')
              artist = parts[0].trim()
              songTitle = parts.slice(1).join(' - ').trim()
            }

            await library.addSong({
              youtubeId: videoId,
              title: songTitle,
              artist: artist,
              channel: item.snippet.videoOwnerChannelTitle || null,
              thumbnail: item.snippet.thumbnails?.default?.url || null,
              source: 'youtube'
            })
            totalImported++
          } catch (e) {
            totalSkipped++
          }
        }

        nextPageToken = itemsData.nextPageToken
      } while (nextPageToken)
    }

    importResults.value = {
      success: true,
      imported: totalImported,
      skipped: totalSkipped,
      message: `Imported ${totalImported} songs from ${playlists.length} playlists`
    }

  } catch (error) {
    console.error('Import error:', error)
    importResults.value = {
      success: false,
      message: error.message || 'Import failed'
    }
  } finally {
    isImporting.value = false
    importProgress.value = { current: 0, total: 0, message: '' }
  }
}

async function importYouTubeLikes() {
  if (!auth.youtubeToken) {
    auth.connectYouTube()
    return
  }

  isImporting.value = true
  importProgress.value = { current: 0, total: 0, message: 'Fetching liked videos...' }
  importResults.value = null

  try {
    let totalImported = 0
    let totalSkipped = 0
    let nextPageToken = null

    do {
      const url = new URL('https://www.googleapis.com/youtube/v3/videos')
      url.searchParams.set('part', 'snippet')
      url.searchParams.set('myRating', 'like')
      url.searchParams.set('maxResults', '50')
      if (nextPageToken) {
        url.searchParams.set('pageToken', nextPageToken)
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${auth.youtubeToken}` }
      })

      if (!response.ok) {
        if (response.status === 401) {
          auth.disconnectYouTube()
          throw new Error('YouTube token expired. Please reconnect.')
        }
        throw new Error('Failed to fetch liked videos')
      }

      const data = await response.json()
      const videos = data.items || []

      importProgress.value = {
        current: totalImported,
        total: data.pageInfo?.totalResults || 0,
        message: `Importing liked videos...`
      }

      for (const video of videos) {
        try {
          const title = video.snippet.title || 'Unknown'
          let artist = null
          let songTitle = title

          if (title.includes(' - ')) {
            const parts = title.split(' - ')
            artist = parts[0].trim()
            songTitle = parts.slice(1).join(' - ').trim()
          }

          await library.addSong({
            youtubeId: video.id,
            title: songTitle,
            artist: artist,
            channel: video.snippet.channelTitle || null,
            thumbnail: video.snippet.thumbnails?.default?.url || null,
            source: 'youtube'
          })
          totalImported++
        } catch (e) {
          totalSkipped++
        }
      }

      nextPageToken = data.nextPageToken
    } while (nextPageToken)

    importResults.value = {
      success: true,
      imported: totalImported,
      skipped: totalSkipped,
      message: `Imported ${totalImported} liked videos`
    }

  } catch (error) {
    console.error('Import error:', error)
    importResults.value = {
      success: false,
      message: error.message || 'Import failed'
    }
  } finally {
    isImporting.value = false
    importProgress.value = { current: 0, total: 0, message: '' }
  }
}

function handleShazamFile(event) {
  const file = event.target.files?.[0]
  if (!file) return

  isImporting.value = true
  importProgress.value = { current: 0, total: 0, message: 'Parsing Shazam CSV...' }
  importResults.value = null

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const csv = e.target?.result
      const lines = csv.split('\n')
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

      const titleIndex = headers.findIndex(h => h.includes('title') || h.includes('name'))
      const artistIndex = headers.findIndex(h => h.includes('artist'))

      if (titleIndex === -1) {
        throw new Error('Could not find title column in CSV')
      }

      let totalImported = 0
      let totalSkipped = 0

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        // Parse CSV line (handle quoted values)
        const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || []
        const cleanValues = values.map(v => v.replace(/^"|"$/g, '').trim())

        const title = cleanValues[titleIndex]
        const artist = artistIndex >= 0 ? cleanValues[artistIndex] : null

        if (!title) continue

        importProgress.value = {
          current: i,
          total: lines.length - 1,
          message: `Processing: ${title}`
        }

        try {
          // For Shazam imports, we don't have YouTube IDs yet
          // We'll use a placeholder that should be resolved later
          await library.addSong({
            youtubeId: `shazam_${Date.now()}_${i}`,
            title: title,
            artist: artist,
            source: 'shazam'
          })
          totalImported++
        } catch (e) {
          totalSkipped++
        }
      }

      importResults.value = {
        success: true,
        imported: totalImported,
        skipped: totalSkipped,
        message: `Imported ${totalImported} songs from Shazam`
      }
    } catch (error) {
      console.error('Shazam import error:', error)
      importResults.value = {
        success: false,
        message: error.message || 'Failed to parse Shazam CSV'
      }
    } finally {
      isImporting.value = false
    }
  }
  reader.readAsText(file)
}

function handleTakeoutFile(event) {
  const file = event.target.files?.[0]
  if (!file) return

  isImporting.value = true
  importProgress.value = { current: 0, total: 0, message: 'Parsing watch history...' }
  importResults.value = null

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const html = e.target?.result
      // Parse YouTube video URLs from the HTML
      const videoRegex = /watch\?v=([a-zA-Z0-9_-]{11})/g
      const matches = [...html.matchAll(videoRegex)]
      const uniqueIds = [...new Set(matches.map(m => m[1]))]

      let totalImported = 0
      let totalSkipped = 0

      for (let i = 0; i < uniqueIds.length; i++) {
        const videoId = uniqueIds[i]

        importProgress.value = {
          current: i + 1,
          total: uniqueIds.length,
          message: `Processing video ${i + 1} of ${uniqueIds.length}`
        }

        try {
          await library.addSong({
            youtubeId: videoId,
            title: `Video ${videoId}`,  // Will be enriched later
            source: 'takeout'
          })
          totalImported++
        } catch (e) {
          totalSkipped++
        }
      }

      importResults.value = {
        success: true,
        imported: totalImported,
        skipped: totalSkipped,
        message: `Imported ${totalImported} videos from watch history`
      }
    } catch (error) {
      console.error('Takeout import error:', error)
      importResults.value = {
        success: false,
        message: error.message || 'Failed to parse watch history'
      }
    } finally {
      isImporting.value = false
    }
  }
  reader.readAsText(file)
}
</script>

<template>
  <div class="p-6 lg:p-8">
    <h1 class="text-2xl font-bold text-white mb-6">Import Music</h1>

    <!-- Import Results Banner -->
    <div
      v-if="importResults"
      :class="importResults.success ? 'bg-green-900/50 border-green-700' : 'bg-red-900/50 border-red-700'"
      class="border rounded-xl p-4 mb-6 flex items-center justify-between"
    >
      <div class="flex items-center gap-3">
        <span class="text-2xl">{{ importResults.success ? '✅' : '❌' }}</span>
        <div>
          <p class="font-medium text-white">{{ importResults.message }}</p>
          <p v-if="importResults.skipped" class="text-sm text-zinc-400">
            {{ importResults.skipped }} items skipped (duplicates or errors)
          </p>
        </div>
      </div>
      <button @click="importResults = null" class="text-zinc-400 hover:text-white">✕</button>
    </div>

    <!-- Progress Bar -->
    <div v-if="isImporting" class="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
      <div class="flex items-center gap-4">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
        <div class="flex-1">
          <p class="text-white font-medium">{{ importProgress.message }}</p>
          <div v-if="importProgress.total > 0" class="mt-2">
            <div class="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                class="h-full bg-indigo-500 transition-all duration-300"
                :style="{ width: `${(importProgress.current / importProgress.total) * 100}%` }"
              ></div>
            </div>
            <p class="text-sm text-zinc-500 mt-1">
              {{ importProgress.current }} / {{ importProgress.total }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6 border-b border-zinc-800 pb-4">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="activeTab === tab.id
          ? 'bg-indigo-600 text-white'
          : 'bg-zinc-800 text-zinc-400 hover:text-white'"
        class="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
      >
        <span>{{ tab.icon }}</span>
        {{ tab.label }}
      </button>
    </div>

    <!-- YouTube Tab -->
    <div v-if="activeTab === 'youtube'" class="space-y-6">
      <!-- YouTube Connection Status -->
      <div v-if="needsYouTubeConnection" class="bg-yellow-900/30 border border-yellow-700 rounded-xl p-6">
        <div class="flex items-start gap-4">
          <span class="text-3xl">🔗</span>
          <div class="flex-1">
            <h3 class="font-semibold text-white mb-2">Connect YouTube</h3>
            <p class="text-sm text-zinc-400 mb-4">
              To import your YouTube playlists and liked videos, you need to connect your YouTube account.
            </p>
            <button
              @click="auth.connectYouTube"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Connect YouTube
            </button>
          </div>
        </div>
      </div>

      <div v-else class="space-y-6">
        <!-- YouTube Connected Badge -->
        <div class="flex items-center gap-2 text-green-400">
          <span>✓</span>
          <span class="text-sm">YouTube connected</span>
          <button @click="auth.disconnectYouTube" class="text-xs text-zinc-500 hover:text-zinc-300 ml-2">
            (Disconnect)
          </button>
        </div>

        <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 class="font-semibold text-white mb-2">Import Playlists</h3>
          <p class="text-sm text-zinc-400 mb-4">
            Import all your YouTube playlists and their songs
          </p>
          <button
            @click="importYouTubePlaylists"
            :disabled="isImporting"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {{ isImporting ? 'Importing...' : 'Import Playlists' }}
          </button>
        </div>

        <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 class="font-semibold text-white mb-2">Import Liked Videos</h3>
          <p class="text-sm text-zinc-400 mb-4">
            Import all videos you've liked on YouTube
          </p>
          <button
            @click="importYouTubeLikes"
            :disabled="isImporting"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {{ isImporting ? 'Importing...' : 'Import Liked Videos' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Shazam Tab -->
    <div v-if="activeTab === 'shazam'" class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h3 class="font-semibold text-white mb-2">Import from Shazam</h3>
      <p class="text-sm text-zinc-400 mb-4">
        Upload your Shazam CSV export from
        <a href="https://www.shazam.com/myshazam" target="_blank" class="text-indigo-400 hover:text-indigo-300">
          shazam.com/myshazam
        </a>
      </p>
      <label class="block">
        <input
          type="file"
          accept=".csv"
          @change="handleShazamFile"
          :disabled="isImporting"
          class="block w-full text-sm text-zinc-400
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-medium
            file:bg-indigo-600 file:text-white
            hover:file:bg-indigo-700
            disabled:opacity-50"
        />
      </label>
    </div>

    <!-- Takeout Tab -->
    <div v-if="activeTab === 'takeout'" class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h3 class="font-semibold text-white mb-2">Import Watch History</h3>
      <div class="text-sm text-zinc-400 mb-4 space-y-2">
        <p>1. Go to <a href="https://takeout.google.com" target="_blank" class="text-indigo-400 hover:text-indigo-300">takeout.google.com</a></p>
        <p>2. Deselect all, then select only "YouTube and YouTube Music"</p>
        <p>3. Under YouTube, select only "history"</p>
        <p>4. Export and download the ZIP</p>
        <p>5. Extract and upload <code class="bg-zinc-800 px-1 rounded">watch-history.html</code></p>
      </div>
      <label class="block">
        <input
          type="file"
          accept=".html"
          @change="handleTakeoutFile"
          :disabled="isImporting"
          class="block w-full text-sm text-zinc-400
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-medium
            file:bg-indigo-600 file:text-white
            hover:file:bg-indigo-700
            disabled:opacity-50"
        />
      </label>
    </div>
  </div>
</template>
