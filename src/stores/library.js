import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../services/api'

export const useLibraryStore = defineStore('library', () => {
  // State
  const songs = ref([])
  const playlists = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const enrichmentStatus = ref({ pending: 0, completed: 0, failed: 0, manual: 0, total: 0 })

  // Getters
  const songCount = computed(() => songs.value.length)
  const lovedSongs = computed(() => songs.value.filter(s => s.rating === 'loved'))
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
  async function fetchSongs() {
    isLoading.value = true
    error.value = null

    try {
      const result = await api.getSongs()
      songs.value = result
    } catch (e) {
      error.value = e.message
      console.error('Failed to fetch songs:', e)
    } finally {
      isLoading.value = false
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
      console.error('Failed to fetch playlists:', e)
    } finally {
      isLoading.value = false
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

  async function rateSong(songId, rating) {
    try {
      await api.rateSong(songId, rating)

      const song = songs.value.find(s => s.id === songId)
      if (song) {
        song.rating = rating
      }
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function incrementPlayCount(songId) {
    try {
      await api.incrementPlayCount(songId)

      const song = songs.value.find(s => s.id === songId)
      if (song) {
        song.play_count++
        song.last_played = new Date().toISOString()
      }
    } catch (e) {
      error.value = e.message
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
        await fetchSongs()
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
      console.error('Failed to fetch enrichment status:', e)
    }
  }

  return {
    // State
    songs,
    playlists,
    isLoading,
    error,
    enrichmentStatus,
    // Getters
    songCount,
    lovedSongs,
    topSongs,
    availableGenres,
    availableMoods,
    // Actions
    fetchSongs,
    fetchPlaylists,
    addSong,
    rateSong,
    incrementPlayCount,
    deleteSong,
    createPlaylist,
    deletePlaylist,
    updateSongTags,
    enrichSongs,
    fetchEnrichmentStatus
  }
})
