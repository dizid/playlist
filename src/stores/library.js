import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../services/api'

export const useLibraryStore = defineStore('library', () => {
  // State
  const songs = ref([])
  const playlists = ref([])
  const history = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  // Same shape as GET /api/enrich/status: per-kind counts, plus the total.
  const enrichmentStatus = ref({
    metadata: { pending: 0, completed: 0, failed: 0, manual: 0 },
    youtube: { valid: 0, pending: 0, not_found: 0 },
    total: 0
  })
  const pagination = ref({ page: 1, limit: 50, total: 0, totalPages: 0 })
  // Plays over the whole library (the server sums them); the loaded page
  // holds at most 200 songs.
  const totalPlays = ref(0)

  // Getters
  // The library's real size from the server's count; the loaded songs are
  // one page of at most 200, so counting them said "200 songs" for anyone
  // with a bigger library.
  const songCount = computed(() => Math.max(pagination.value.total || 0, songs.value.length))
  const topSongs = computed(() =>
    [...songs.value]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 50)
  )

  // Unique genres across all songs
  const availableGenres = computed(() => {
    const genres = new Set()
    songs.value.forEach(s => s.genres?.forEach(g => genres.add(g)))
    return Array.from(genres).sort()
  })

  // Unique moods across all songs
  const availableMoods = computed(() => {
    const moods = new Set()
    songs.value.forEach(s => s.moods?.forEach(m => moods.add(m)))
    return Array.from(moods).sort()
  })

  // Actions
  async function fetchSongs({ page = 1, limit = 500, append = false } = {}) {
    isLoading.value = true
    error.value = null

    try {
      const result = await api.getSongs({}, { page, limit })
      songs.value = append ? [...songs.value, ...result.songs] : result.songs
      pagination.value = result.pagination
      if (typeof result.totalPlays === 'number') totalPlays.value = result.totalPlays
    } catch (e) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  // Whole-library search results (the loaded list holds at most one page of
  // 200). null = no server search active. Doesn't touch songs/pagination/totals.
  const searchResults = ref(null)
  const isSearching = ref(false)
  let searchSeq = 0

  async function searchSongs(query) {
    const q = (query || '').trim()
    const seq = ++searchSeq
    if (!q) {
      searchResults.value = null
      isSearching.value = false
      return
    }
    isSearching.value = true
    try {
      const result = await api.getSongs({ q }, { page: 1, limit: 200 })
      // Ignore answers to an older query that arrive late
      if (seq === searchSeq) {
        searchResults.value = { query: q, songs: result.songs, total: result.pagination.total }
      }
    } catch (e) {
      if (seq === searchSeq) error.value = e.message
    } finally {
      if (seq === searchSeq) isSearching.value = false
    }
  }

  async function loadMore() {
    if (pagination.value.page < pagination.value.totalPages) {
      await fetchSongs({
        page: pagination.value.page + 1,
        limit: pagination.value.limit,
        append: true
      })
    }
  }

  async function fetchPlaylists() {
    isLoading.value = true
    error.value = null

    try {
      const result = await api.getPlaylists()
      playlists.value = result
    } catch (e) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  async function fetchHistory(limit = 10) {
    try {
      const result = await api.getHistory(limit)
      history.value = result
    } catch (e) {
      // History fetch is non-critical — don't set error.value
    }
  }

  async function addSong(song) {
    try {
      const newSong = await api.addSong({
        youtubeId: song.youtubeId,
        title: song.title,
        artist: song.artist,
        channel: song.channel,
        duration: song.duration,
        thumbnail: song.thumbnail,
        source: song.source
      })

      const existingIndex = songs.value.findIndex(s => s.youtube_id === song.youtubeId)
      if (existingIndex >= 0) {
        songs.value[existingIndex] = newSong
      } else {
        songs.value.push(newSong)
      }
      return newSong
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  // Screen-only update after a play was logged. POST /api/history (api.logPlay)
  // already adds 1 to play_count in the database; this used to also PATCH
  // the song with incrementPlayCount, so every Play tap counted twice.
  function incrementPlayCount(songId) {
    const song = songs.value.find(s => s.id === songId)
    if (song) {
      song.play_count = (song.play_count || 0) + 1
      song.last_played = new Date().toISOString()
    }
  }

  async function deleteSong(songId) {
    try {
      await api.deleteSong(songId)
      songs.value = songs.value.filter(s => s.id !== songId)
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function createPlaylist(playlist) {
    try {
      const newPlaylist = await api.createPlaylist(playlist)
      playlists.value.unshift(newPlaylist)
      return newPlaylist
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  // The three smart playlists the landing page promises. Rules use what the
  // database really has (play counts, dates); there are no song ratings.
  // Listed oldest first: the API returns playlists newest first, so Top 50
  // ends up at the top.
  const DEFAULT_SMART_PLAYLISTS = [
    { name: 'Fresh Loves', type: 'smart', rules: { sortBy: 'created_at', sortOrder: 'desc', minPlayCount: 2, limit: 50 } },
    { name: 'Heavy Rotation', type: 'smart', rules: { sortBy: 'last_played', sortOrder: 'desc', minPlayCount: 3, limit: 50 } },
    { name: 'Top 50', type: 'smart', rules: { sortBy: 'play_count', sortOrder: 'desc', limit: 50 } }
  ]

  /**
   * Creates the default smart playlists once, for a user who has songs but no
   * playlists yet. Nothing in the app created playlists before, so every
   * Dashboard said "Playlists 0". Remembered per user on this device, so
   * someone who deletes them on purpose doesn't get them back here.
   */
  // One run at a time: leaving and reopening the Dashboard quickly must not
  // start a second run that also sees "no playlists" and makes a second set.
  let defaultPlaylistsRun = null

  function ensureDefaultPlaylists(userKey) {
    if (!defaultPlaylistsRun) {
      defaultPlaylistsRun = createDefaultPlaylists(userKey).finally(() => {
        defaultPlaylistsRun = null
      })
    }
    return defaultPlaylistsRun
  }

  async function createDefaultPlaylists(userKey) {
    if (!userKey || playlists.value.length > 0 || songCount.value === 0) return
    const flag = `tunecraft:default-playlists:${userKey}`
    try {
      if (window.localStorage.getItem(flag)) return
    } catch {
      // storage blocked: still create them (the playlist check below stops repeats)
    }
    // Ask the server again: a failed earlier fetch also leaves the list empty,
    // and that must not create a second set.
    const existing = await api.getPlaylists()
    if (!Array.isArray(existing) || existing.length > 0) {
      if (Array.isArray(existing)) playlists.value = existing
      return
    }
    for (const playlist of DEFAULT_SMART_PLAYLISTS) {
      await createPlaylist(playlist)
    }
    try {
      window.localStorage.setItem(flag, '1')
    } catch {
      // storage blocked: nothing to remember
    }
  }

  async function deletePlaylist(playlistId) {
    try {
      await api.deletePlaylist(playlistId)
      playlists.value = playlists.value.filter(p => p.id !== playlistId)
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function updateSongTags(songId, { genres, moods }) {
    try {
      await api.updateSongTags(songId, { genres, moods })

      const song = songs.value.find(s => s.id === songId)
      if (song) {
        song.genres = genres
        song.moods = moods
        song.enrichment_status = 'manual'
      }
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function enrichSongs(options = {}) {
    try {
      const result = await api.enrichSongs(options)

      // Refetch songs to get updated genres/moods
      if (result.enriched > 0) {
        await fetchSongs({ page: pagination.value.page, limit: pagination.value.limit })
      }

      // Update enrichment status
      await fetchEnrichmentStatus()

      return result
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function fetchEnrichmentStatus() {
    try {
      const status = await api.getEnrichmentStatus()
      enrichmentStatus.value = status
      return status
    } catch (e) {
      // Enrichment status is non-critical — don't set error.value
    }
  }

  return {
    // State
    songs,
    playlists,
    history,
    isLoading,
    error,
    enrichmentStatus,
    pagination,
    totalPlays,
    // Getters
    songCount,
    topSongs,
    availableGenres,
    availableMoods,
    // Actions
    fetchSongs,
    loadMore,
    searchResults,
    isSearching,
    searchSongs,
    fetchPlaylists,
    fetchHistory,
    addSong,
    incrementPlayCount,
    deleteSong,
    createPlaylist,
    ensureDefaultPlaylists,
    deletePlaylist,
    updateSongTags,
    enrichSongs,
    fetchEnrichmentStatus
  }
})
