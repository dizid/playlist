import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../services/api'

export const useLibraryStore = defineStore('library', () => {
  // State
  const songs = ref([])
  const playlists = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  // Getters
  const songCount = computed(() => songs.value.length)
  const lovedSongs = computed(() => songs.value.filter(s => s.rating === 'loved'))
  const topSongs = computed(() =>
    [...songs.value]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 50)
  )

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

  return {
    // State
    songs,
    playlists,
    isLoading,
    error,
    // Getters
    songCount,
    lovedSongs,
    topSongs,
    // Actions
    fetchSongs,
    fetchPlaylists,
    addSong,
    rateSong,
    incrementPlayCount,
    deleteSong,
    createPlaylist,
    deletePlaylist
  }
})
