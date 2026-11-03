<script setup>
// Connect Last.fm / ListenBrainz once; every play (Spotify, YouTube Music, Apple Music...) syncs in.
// A sync request does a few seconds of work, so this panel keeps calling it while the page is
// open until the whole history is in. The hourly server job continues if the page is closed.
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { api } from '../services/api'
import { useLibraryStore } from '../stores/library'

const library = useLibraryStore()

const SERVICES = [
  {
    id: 'lastfm',
    name: 'Last.fm',
    placeholder: 'Your Last.fm username',
    profileUrl: (username) => `https://www.last.fm/user/${encodeURIComponent(username)}`,
    signupUrl: 'https://www.last.fm/join',
    help: [
      { label: 'Spotify', text: 'on last.fm open Settings → Applications → Spotify Scrobbling → Connect.' },
      { label: 'YouTube Music / YouTube', text: 'install the free Web Scrobbler browser extension and sign in with Last.fm.', url: 'https://web-scrobbler.com/' },
      { label: 'Apple Music and others', text: 'see Last.fm\'s list of supported players.', url: 'https://www.last.fm/about/trackmymusic' }
    ]
  },
  {
    id: 'listenbrainz',
    name: 'ListenBrainz',
    placeholder: 'Your ListenBrainz username',
    profileUrl: (username) => `https://listenbrainz.org/user/${encodeURIComponent(username)}/`,
    signupUrl: 'https://listenbrainz.org/login/',
    help: [
      { label: 'Spotify', text: 'on listenbrainz.org open Settings → Connect services → Spotify.' },
      { label: 'YouTube Music / YouTube', text: 'install the Web Scrobbler extension and enable ListenBrainz.', url: 'https://web-scrobbler.com/' },
      { label: 'Free and open', text: 'run by the non-profit MetaBrainz Foundation.' }
    ]
  }
]

// Safety cap on sync calls per session (~4s of work each: plenty for 100k+ plays)
const MAX_SYNC_CALLS = 400
// Another run (e.g. the hourly job) holds the lock: wait, then retry this many times
const BUSY_RETRY_MS = 5000
const MAX_BUSY_RETRIES = 30

const connections = ref({})       // provider -> connection row
const usernames = reactive({ lastfm: '', listenbrainz: '' })
const syncing = reactive({ lastfm: false, listenbrainz: false })
const connecting = reactive({ lastfm: false, listenbrainz: false })
const errors = reactive({ lastfm: '', listenbrainz: '' })
const confirmDisconnect = ref(null)
const isLoading = ref(true)
let unmounted = false

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function setConnection(connection) {
  if (connection) connections.value = { ...connections.value, [connection.provider]: connection }
}

onMounted(async () => {
  try {
    const rows = await api.getConnections()
    rows.forEach(setConnection)
    // Resume unfinished history imports while the page is open
    for (const row of rows) {
      if (!row.backfill_done && row.status !== 'error') runSync(row.provider)
    }
  } catch (e) {
    console.error('Failed to load connections:', e)
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  unmounted = true
})

async function connect(provider) {
  const username = usernames[provider].trim()
  if (!username) return
  connecting[provider] = true
  errors[provider] = ''
  try {
    setConnection(await api.connectService(provider, username))
    usernames[provider] = ''
    runSync(provider)
  } catch (e) {
    errors[provider] = e.message
  } finally {
    connecting[provider] = false
  }
}

async function runSync(provider) {
  if (syncing[provider]) return
  syncing[provider] = true
  errors[provider] = ''
  let importedThisSession = 0
  let busyRetries = 0

  try {
    for (let call = 0; call < MAX_SYNC_CALLS && !unmounted; call++) {
      const outcome = await api.syncConnection(provider)
      if (outcome.busy) {
        if (++busyRetries > MAX_BUSY_RETRIES) break
        await sleep(BUSY_RETRY_MS)
        continue
      }
      setConnection(outcome.connection)
      importedThisSession += outcome.importedPlays
      // Done, or an error the user must fix, or a temporary error the hourly job will retry
      if (outcome.complete || !outcome.connection || outcome.connection.last_error) break
    }
  } catch (e) {
    errors[provider] = e.message
  } finally {
    syncing[provider] = false
    // Show the new songs and play counts in the library
    if (importedThisSession > 0 && !unmounted) library.fetchSongs()
  }
}

async function disconnect(provider) {
  confirmDisconnect.value = null
  try {
    await api.disconnectService(provider)
    const next = { ...connections.value }
    delete next[provider]
    connections.value = next
  } catch (e) {
    errors[provider] = e.message
  }
}

function progressPercent(connection) {
  if (connection.backfill_done) return 100
  if (!connection.provider_total_plays) return 0
  return Math.min(99, Math.round((connection.plays_imported / connection.provider_total_plays) * 100))
}

function timeAgo(timestamp) {
  if (!timestamp) return 'never'
  const minutes = Math.round((Date.now() - new Date(timestamp).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return `${Math.round(hours / 24)} days ago`
}

const formatNumber = (value) => Number(value || 0).toLocaleString()
</script>

<template>
  <section class="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6 mb-6" aria-labelledby="connections-heading">
    <h2 id="connections-heading" class="text-lg font-semibold text-white">Connect once, sync forever</h2>
    <p class="text-sm text-zinc-400 mt-1 mb-4">
      Link Last.fm or ListenBrainz and every song you play on Spotify, YouTube Music, Apple Music and more
      lands here automatically, with real play counts. No exports, no uploads.
    </p>

    <div v-if="isLoading" class="text-sm text-zinc-500" aria-live="polite">Loading connections...</div>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <div
        v-for="service in SERVICES"
        :key="service.id"
        class="border border-zinc-800 rounded-lg p-4 bg-zinc-950/40"
      >
        <!-- Header -->
        <div class="flex items-center justify-between gap-2 mb-3">
          <h3 class="font-medium text-white">{{ service.name }}</h3>
          <template v-if="connections[service.id]">
            <span v-if="syncing[service.id]" class="text-xs px-2 py-1 rounded-full bg-indigo-600/20 text-indigo-300">Syncing...</span>
            <span v-else-if="connections[service.id].status === 'error'" class="text-xs px-2 py-1 rounded-full bg-amber-500/15 text-amber-400">Needs attention</span>
            <span v-else class="text-xs px-2 py-1 rounded-full bg-green-500/15 text-green-400">Connected</span>
          </template>
        </div>

        <!-- Connected -->
        <div v-if="connections[service.id]" aria-live="polite">
          <a
            :href="service.profileUrl(connections[service.id].external_username)"
            target="_blank"
            rel="noopener"
            class="text-sm text-indigo-400 hover:text-indigo-300"
          >@{{ connections[service.id].external_username }}</a>

          <p class="text-sm text-zinc-400 mt-2">
            <template v-if="connections[service.id].backfill_done">
              All {{ formatNumber(connections[service.id].plays_imported) }} plays imported
            </template>
            <template v-else>
              {{ formatNumber(connections[service.id].plays_imported) }}
              <span v-if="connections[service.id].provider_total_plays">
                of {{ formatNumber(connections[service.id].provider_total_plays) }}
              </span>
              plays imported
            </template>
            <span class="text-zinc-600"> · synced {{ timeAgo(connections[service.id].last_synced_at) }}</span>
          </p>

          <div
            v-if="!connections[service.id].backfill_done"
            class="h-2 bg-zinc-800 rounded-full overflow-hidden mt-2"
            role="progressbar"
            :aria-valuenow="progressPercent(connections[service.id])"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div class="h-full bg-indigo-500 transition-all duration-300" :style="{ width: progressPercent(connections[service.id]) + '%' }"></div>
          </div>
          <p v-if="syncing[service.id] && !connections[service.id].backfill_done" class="text-xs text-zinc-500 mt-2">
            Importing your history. You can leave this page; it continues in the background every hour.
          </p>

          <p v-if="connections[service.id].last_error" class="text-sm text-amber-400 mt-2">
            {{ connections[service.id].last_error }}
          </p>
          <p v-if="errors[service.id]" class="text-sm text-red-400 mt-2" role="alert">{{ errors[service.id] }}</p>

          <div class="flex flex-wrap gap-2 mt-4">
            <button
              @click="runSync(service.id)"
              :disabled="syncing[service.id]"
              class="px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {{ syncing[service.id] ? 'Syncing...' : 'Sync now' }}
            </button>
            <button
              v-if="confirmDisconnect !== service.id"
              @click="confirmDisconnect = service.id"
              class="px-3 py-2 text-sm text-zinc-400 hover:text-white rounded-lg transition-colors"
            >
              Disconnect
            </button>
            <template v-else>
              <button
                @click="disconnect(service.id)"
                class="px-3 py-2 text-sm text-red-400 hover:text-red-300 rounded-lg transition-colors"
              >
                Yes, disconnect
              </button>
              <button
                @click="confirmDisconnect = null"
                class="px-3 py-2 text-sm text-zinc-400 hover:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </template>
          </div>
          <p v-if="confirmDisconnect === service.id" class="text-xs text-zinc-500 mt-2">
            Songs and plays already imported stay in your library.
          </p>
        </div>

        <!-- Not connected -->
        <div v-else>
          <form class="flex gap-2" @submit.prevent="connect(service.id)">
            <label :for="'username-' + service.id" class="sr-only">{{ service.placeholder }}</label>
            <input
              :id="'username-' + service.id"
              v-model="usernames[service.id]"
              type="text"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              :placeholder="service.placeholder"
              class="flex-1 min-w-0 px-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              :disabled="connecting[service.id] || !usernames[service.id].trim()"
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {{ connecting[service.id] ? 'Checking...' : 'Connect' }}
            </button>
          </form>
          <p v-if="errors[service.id]" class="text-sm text-red-400 mt-2" role="alert">{{ errors[service.id] }}</p>

          <details class="mt-3 text-sm">
            <summary class="text-zinc-400 cursor-pointer hover:text-white">How do my plays get into {{ service.name }}?</summary>
            <ul class="mt-2 space-y-1 text-zinc-500">
              <li v-for="tip in service.help" :key="tip.label">
                <span class="text-zinc-300">{{ tip.label }}:</span>
                {{ tip.text }}
                <a v-if="tip.url" :href="tip.url" target="_blank" rel="noopener" class="text-indigo-400 hover:text-indigo-300">Open</a>
              </li>
              <li>
                No account yet?
                <a :href="service.signupUrl" target="_blank" rel="noopener" class="text-indigo-400 hover:text-indigo-300">Create one free</a>
              </li>
            </ul>
          </details>
        </div>
      </div>
    </div>

    <!-- Required by the Last.fm API terms -->
    <p class="text-xs text-zinc-600 mt-4">Last.fm data powered by AudioScrobbler.</p>
  </section>
</template>
