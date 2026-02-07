<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useLibraryStore } from '../stores/library'
import { api } from '../services/api'
import {
  isPushSupported,
  getPermissionStatus,
  subscribeToPush,
  isSubscribed,
  initializePush
} from '../services/push-notifications'

const auth = useAuthStore()
const library = useLibraryStore()

const activeTab = ref('youtube')
const isCollectingData = ref(false)
const isSendingToServer = ref(false)
const isImporting = computed(() => isCollectingData.value || isSendingToServer.value)
const importProgress = ref({ current: 0, total: 0, message: '' })
const importResults = ref(null)

// Active background job tracking
const activeJob = ref(null)
const jobPollingInterval = ref(null)

// Push notification state
const pushSupported = ref(false)
const pushPermission = ref('default')
const pushSubscribed = ref(false)

// Email for notifications
const notifyEmail = ref('')

// Initialize push notifications
onMounted(async () => {
  pushSupported.value = isPushSupported()
  pushPermission.value = getPermissionStatus()
  pushSubscribed.value = await isSubscribed()

  // Initialize service worker
  if (pushSupported.value) {
    await initializePush()
    pushSubscribed.value = await isSubscribed()
  }

  // Check for active import job
  await checkActiveJob()
})

onUnmounted(() => {
  if (jobPollingInterval.value) {
    clearInterval(jobPollingInterval.value)
  }
})

async function checkActiveJob() {
  try {
    const result = await api.getActiveImportJob()
    if (result.active && result.job) {
      activeJob.value = result.job
      // Start polling if job is in progress
      if (result.job.status === 'pending' || result.job.status === 'processing') {
        startJobPolling()
      }
    }
  } catch (e) {
    console.error('Failed to check active job:', e)
  }
}

function startJobPolling() {
  if (jobPollingInterval.value) return

  jobPollingInterval.value = setInterval(async () => {
    if (!activeJob.value) {
      clearInterval(jobPollingInterval.value)
      jobPollingInterval.value = null
      return
    }

    try {
      const job = await api.getImportJobStatus(activeJob.value.id)
      activeJob.value = job

      // Stop polling when job completes
      if (job.status === 'completed' || job.status === 'failed') {
        clearInterval(jobPollingInterval.value)
        jobPollingInterval.value = null

        // Refresh library
        if (job.status === 'completed') {
          library.fetchSongs()
        }
      }
    } catch (e) {
      console.error('Failed to poll job status:', e)
    }
  }, 2000) // Poll every 2 seconds
}

async function enablePushNotifications() {
  try {
    await subscribeToPush()
    pushSubscribed.value = true
    pushPermission.value = 'granted'
  } catch (e) {
    console.error('Failed to enable push:', e)
    alert(e.message || 'Failed to enable notifications')
  }
}

const tabs = [
  { id: 'youtube', label: 'YouTube', icon: '📺' },
  { id: 'shazam', label: 'Shazam', icon: '🎤' },
  { id: 'takeout', label: 'Google Takeout', icon: '📦' }
]

// Channels that typically don't have music content
const BLOCKED_CHANNELS = [
  'Coin Bureau', 'InvestAnswers', 'Real Vision', 'Benjamin Cowen',
  'Binance', 'RTL Z', 'BR24', 'TED', 'TEDx Talks', 'CoinDesk',
  'Bloomberg', 'CNBC', 'CNN', 'BBC', 'Reuters', 'NPR'
]

// Check if YouTube is connected
const needsYouTubeConnection = computed(() => !auth.hasYouTubeAccess)

// Submit songs for background processing
async function submitBackgroundImport(type, songs) {
  if (songs.length === 0) {
    importResults.value = {
      success: false,
      message: 'No songs to import'
    }
    return
  }

  isSendingToServer.value = true
  importProgress.value = { current: 0, total: 0, message: 'Starting background import...' }

  try {
    const result = await api.createImportJob({
      type,
      songs,
      notifyEmail: !!notifyEmail.value,
      notifyPush: pushSubscribed.value,
      email: notifyEmail.value || null
    })

    activeJob.value = {
      id: result.jobId,
      status: result.status,
      total_items: result.totalItems,
      processed_items: 0
    }

    importResults.value = {
      success: true,
      isBackground: true,
      message: `${result.totalItems} songs queued for import. You can close this page - we'll notify you when done!`,
      jobId: result.jobId
    }

    // Start polling
    startJobPolling()
  } catch (e) {
    console.error('Failed to start background import:', e)
    importResults.value = {
      success: false,
      message: e.message || 'Failed to start import'
    }
  } finally {
    isSendingToServer.value = false
    importProgress.value = { current: 0, total: 0, message: '' }
  }
}

async function importYouTubePlaylists() {
  if (!auth.youtubeToken) {
    auth.connectYouTube()
    return
  }

  isCollectingData.value = true
  importProgress.value = { current: 0, total: 0, message: 'Fetching playlists...' }
  importResults.value = null

  const collectedSongs = []

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

    let totalNonMusic = 0

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

        // Collect video IDs for batch category lookup
        const videoIds = items
          .map(item => item.snippet?.resourceId?.videoId)
          .filter(Boolean)

        if (videoIds.length === 0) {
          nextPageToken = itemsData.nextPageToken
          continue
        }

        // Fetch video details to get category
        const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
        detailsUrl.searchParams.set('part', 'snippet')
        detailsUrl.searchParams.set('id', videoIds.join(','))

        const detailsResponse = await fetch(detailsUrl, {
          headers: { Authorization: `Bearer ${auth.youtubeToken}` }
        })

        let videoDetails = {}
        if (detailsResponse.ok) {
          const detailsData = await detailsResponse.json()
          for (const video of detailsData.items || []) {
            videoDetails[video.id] = video.snippet
          }
        }

        // Collect each video (with filtering)
        for (const item of items) {
          const videoId = item.snippet?.resourceId?.videoId
          if (!videoId) continue

          const details = videoDetails[videoId]
          const channelTitle = details?.channelTitle || item.snippet.videoOwnerChannelTitle || ''

          // Filter: Skip non-music videos (category 10 = Music)
          if (details && details.categoryId !== '10') {
            totalNonMusic++
            continue
          }

          // Filter: Skip blocked channels
          if (BLOCKED_CHANNELS.some(ch => channelTitle.includes(ch))) {
            totalNonMusic++
            continue
          }

          // Parse artist from title
          const title = details?.title || item.snippet.title || 'Unknown'
          let artist = null
          let songTitle = title

          if (title.includes(' - ')) {
            const parts = title.split(' - ')
            artist = parts[0].trim()
            songTitle = parts.slice(1).join(' - ').trim()
          }

          collectedSongs.push({
            youtubeId: videoId,
            title: songTitle,
            artist: artist,
            channel: channelTitle || null,
            thumbnail: details?.thumbnails?.default?.url || item.snippet.thumbnails?.default?.url || null,
            source: 'youtube'
          })
        }

        nextPageToken = itemsData.nextPageToken
      } while (nextPageToken)
    }

    isCollectingData.value = false

    // Submit for background processing
    await submitBackgroundImport('youtube_playlists', collectedSongs)

    if (totalNonMusic > 0 && importResults.value?.success) {
      importResults.value.message += ` (${totalNonMusic} non-music videos filtered)`
    }

  } catch (error) {
    console.error('Import error:', error)
    importResults.value = {
      success: false,
      message: error.message || 'Import failed'
    }
    isCollectingData.value = false
  }
}

async function importYouTubeLikes() {
  if (!auth.youtubeToken) {
    auth.connectYouTube()
    return
  }

  isCollectingData.value = true
  importProgress.value = { current: 0, total: 0, message: 'Fetching liked videos...' }
  importResults.value = null

  const collectedSongs = []
  let totalSkipped = 0

  try {
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
        current: collectedSongs.length,
        total: data.pageInfo?.totalResults || 0,
        message: 'Collecting music from liked videos...'
      }

      for (const video of videos) {
        // Skip non-music videos (categoryId 10 = Music)
        if (video.snippet.categoryId !== '10') {
          totalSkipped++
          continue
        }

        const title = video.snippet.title || 'Unknown'
        let artist = null
        let songTitle = title

        if (title.includes(' - ')) {
          const parts = title.split(' - ')
          artist = parts[0].trim()
          songTitle = parts.slice(1).join(' - ').trim()
        }

        collectedSongs.push({
          youtubeId: video.id,
          title: songTitle,
          artist: artist,
          channel: video.snippet.channelTitle || null,
          thumbnail: video.snippet.thumbnails?.default?.url || null,
          source: 'youtube'
        })
      }

      nextPageToken = data.nextPageToken
    } while (nextPageToken)

    isCollectingData.value = false

    // Submit for background processing
    await submitBackgroundImport('youtube_likes', collectedSongs)

    if (totalSkipped > 0 && importResults.value?.success) {
      importResults.value.message += ` (${totalSkipped} non-music videos filtered)`
    }

  } catch (error) {
    console.error('Import error:', error)
    importResults.value = {
      success: false,
      message: error.message || 'Import failed'
    }
    isCollectingData.value = false
  }
}

function handleShazamFile(event) {
  const file = event.target.files?.[0]
  if (!file) return

  isCollectingData.value = true
  importProgress.value = { current: 0, total: 0, message: 'Parsing Shazam CSV...' }
  importResults.value = null

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      let csv = e.target?.result
      // Remove BOM if present
      if (csv.charCodeAt(0) === 0xFEFF) {
        csv = csv.slice(1)
      }
      let lines = csv.split('\n').map(l => l.trim()).filter(l => l)

      // Skip metadata lines
      while (lines.length > 0 && !lines[0].includes(',')) {
        lines = lines.slice(1)
      }

      if (lines.length === 0) {
        throw new Error('CSV file appears to be empty')
      }

      // Parse headers
      const headerLine = lines[0]
      const headers = headerLine.split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase())

      const titleIndex = headers.findIndex(h =>
        h === 'title' || h === 'name' || h === 'track' || h === 'song' ||
        h.includes('title') || h.includes('name')
      )
      const artistIndex = headers.findIndex(h =>
        h === 'artist' || h.includes('artist')
      )

      if (titleIndex === -1) {
        throw new Error(`Could not find title column in CSV. Found headers: ${headers.join(', ')}`)
      }

      const collectedSongs = []

      // Helper to parse CSV line properly
      function parseCSVLine(line) {
        const result = []
        let current = ''
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        result.push(current.trim())
        return result
      }

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        if (!line) continue

        const cleanValues = parseCSVLine(line)
        const title = cleanValues[titleIndex]
        const artist = artistIndex >= 0 ? cleanValues[artistIndex] : null

        if (!title) continue

        importProgress.value = {
          current: i,
          total: lines.length - 1,
          message: `Parsing: ${title}`
        }

        collectedSongs.push({
          youtubeId: null, // Will be searched server-side
          title: title,
          artist: artist,
          source: 'shazam'
        })
      }

      isCollectingData.value = false

      // Submit for background processing
      await submitBackgroundImport('shazam', collectedSongs)

    } catch (error) {
      console.error('Shazam import error:', error)
      importResults.value = {
        success: false,
        message: error.message || 'Failed to parse Shazam CSV'
      }
      isCollectingData.value = false
    }
  }
  reader.readAsText(file)
}

function handleTakeoutFile(event) {
  const file = event.target.files?.[0]
  if (!file) return

  isCollectingData.value = true
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

      const collectedSongs = uniqueIds.map(videoId => ({
        youtubeId: videoId,
        title: `Video ${videoId}`, // Will be enriched later
        source: 'takeout'
      }))

      isCollectingData.value = false

      // Submit for background processing
      await submitBackgroundImport('takeout', collectedSongs)

    } catch (error) {
      console.error('Takeout import error:', error)
      importResults.value = {
        success: false,
        message: error.message || 'Failed to parse watch history'
      }
      isCollectingData.value = false
    }
  }
  reader.readAsText(file)
}

function dismissActiveJob() {
  activeJob.value = null
  if (jobPollingInterval.value) {
    clearInterval(jobPollingInterval.value)
    jobPollingInterval.value = null
  }
}
</script>

<template>
  <div class="p-6 lg:p-8" role="main">
    <h1 class="text-2xl font-bold text-white mb-6">Import Music</h1>

    <!-- Active Background Job -->
    <div
      v-if="activeJob"
      class="bg-indigo-900/30 border border-indigo-700 rounded-xl p-4 mb-6"
      aria-live="polite"
    >
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-4">
          <div v-if="activeJob.status === 'processing' || activeJob.status === 'pending'" class="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400"></div>
          <span v-else-if="activeJob.status === 'completed'" class="text-2xl">✅</span>
          <span v-else class="text-2xl">❌</span>
          <div>
            <p class="font-medium text-white">
              {{ activeJob.status === 'completed' ? 'Import complete!' :
                 activeJob.status === 'failed' ? 'Import failed' :
                 'Import in progress...' }}
            </p>
            <p class="text-sm text-zinc-400">
              {{ activeJob.processed_items || 0 }} / {{ activeJob.total_items }} processed
              <span v-if="activeJob.inserted_items"> • {{ activeJob.inserted_items }} added</span>
              <span v-if="activeJob.skipped_items"> • {{ activeJob.skipped_items }} skipped</span>
            </p>
            <p v-if="activeJob.status === 'pending' || activeJob.status === 'processing'" class="text-xs text-zinc-500 mt-1">
              You can close this page - we'll notify you when done
            </p>
            <p v-if="activeJob.error_message" class="text-sm text-red-400 mt-1">
              {{ activeJob.error_message }}
            </p>
          </div>
        </div>
        <button
          v-if="activeJob.status === 'completed' || activeJob.status === 'failed'"
          @click="dismissActiveJob"
          aria-label="Dismiss import status"
          class="text-zinc-400 hover:text-white"
        >✕</button>
      </div>
      <!-- Progress bar -->
      <div v-if="activeJob.total_items > 0" class="mt-3">
        <div class="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            class="h-full transition-all duration-300"
            :class="activeJob.status === 'failed' ? 'bg-red-500' : 'bg-indigo-500'"
            :style="{ width: `${((activeJob.processed_items || 0) / activeJob.total_items) * 100}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Import Results Banner -->
    <div
      v-if="importResults && !importResults.isBackground"
      :class="importResults.success ? 'bg-green-900/50 border-green-700' : 'bg-red-900/50 border-red-700'"
      class="border rounded-xl p-4 mb-6 flex items-center justify-between"
    >
      <div class="flex items-center gap-3">
        <span class="text-2xl">{{ importResults.success ? '✅' : '❌' }}</span>
        <p class="font-medium text-white">{{ importResults.message }}</p>
      </div>
      <button @click="importResults = null" class="text-zinc-400 hover:text-white">✕</button>
    </div>

    <!-- Background Import Success -->
    <div
      v-if="importResults?.isBackground"
      class="bg-green-900/50 border border-green-700 rounded-xl p-4 mb-6"
    >
      <div class="flex items-center gap-3">
        <span class="text-2xl">🚀</span>
        <div>
          <p class="font-medium text-white">{{ importResults.message }}</p>
          <p v-if="pushSubscribed" class="text-sm text-zinc-400 mt-1">
            You'll receive a browser notification when complete.
          </p>
          <p v-if="notifyEmail" class="text-sm text-zinc-400 mt-1">
            We'll also email you at {{ notifyEmail }} (check spam folder if needed)
          </p>
        </div>
      </div>
    </div>

    <!-- Progress Bar (data collection phase) -->
    <div v-if="isCollectingData || isSendingToServer" class="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6" aria-live="polite">
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

    <!-- Notification Settings -->
    <div v-if="!activeJob" class="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
      <h3 class="font-semibold text-white mb-3">Notification Settings</h3>
      <p class="text-sm text-zinc-400 mb-4">Get notified when your import completes (you can close this page)</p>

      <div class="space-y-3">
        <!-- Push Notifications -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span>🔔</span>
            <span class="text-white">Browser notifications</span>
          </div>
          <div v-if="!pushSupported" class="text-sm text-zinc-500">Not supported</div>
          <div v-else-if="pushSubscribed" class="text-sm text-green-400">Enabled</div>
          <button
            v-else
            @click="enablePushNotifications"
            class="text-sm px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Enable
          </button>
        </div>

        <!-- Email -->
        <div class="flex items-center gap-3">
          <span>📧</span>
          <input
            v-model="notifyEmail"
            type="email"
            placeholder="Email (optional)"
            class="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>
        <p class="text-xs text-zinc-500 pl-7">Check your spam folder if you don't see the email</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6 border-b border-zinc-800 pb-4">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        :aria-label="'Import from ' + tab.label"
        :aria-pressed="activeTab === tab.id"
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
            :disabled="isImporting || !!activeJob"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {{ isCollectingData ? 'Collecting...' : isSendingToServer ? 'Starting...' : 'Import Playlists' }}
          </button>
        </div>

        <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 class="font-semibold text-white mb-2">Import Liked Music</h3>
          <p class="text-sm text-zinc-400 mb-4">
            Import music videos you've liked on YouTube
          </p>
          <button
            @click="importYouTubeLikes"
            :disabled="isImporting || !!activeJob"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {{ isCollectingData ? 'Collecting...' : isSendingToServer ? 'Starting...' : 'Import Liked Music' }}
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
          :disabled="isImporting || !!activeJob"
          aria-label="Upload Shazam CSV file"
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
          :disabled="isImporting || !!activeJob"
          aria-label="Upload Google Takeout watch history file"
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
