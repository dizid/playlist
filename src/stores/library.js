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
    fetchPlaylists,
    fetchHistory,
    addSong,
    incrementPlayCount,
    deleteSong,
    createPlaylist,
    deletePlaylist,
    updateSongTags,
    enrichSongs,
    fetchEnrichmentStatus
  }
})
