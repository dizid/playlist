// API service for TuneLayer
// Handles all server-side API calls with authentication

import { getSessionToken } from './auth-client'

// Fetch wrapper with authentication
async function fetchWithAuth(endpoint, options = {}) {
  const token = getSessionToken()

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers
    }
  })

  // Handle unauthorized - could trigger re-auth flow
  if (response.status === 401) {
    throw new Error('Unauthorized - please log in again')
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `API error: ${response.status}`)
  }

  return response.json()
}

export const api = {
  // Songs
  async getSongs() {
    return fetchWithAuth('/songs')
  },

  async addSong(song) {
    return fetchWithAuth('/songs', {
      method: 'POST',
      body: JSON.stringify(song)
    })
  },

  async rateSong(songId, rating) {
    return fetchWithAuth(`/songs/${songId}`, {
      method: 'PATCH',
      body: JSON.stringify({ rating })
    })
  },

  async incrementPlayCount(songId) {
    return fetchWithAuth(`/songs/${songId}`, {
      method: 'PATCH',
      body: JSON.stringify({ incrementPlayCount: true })
    })
  },

  async deleteSong(songId) {
    return fetchWithAuth(`/songs/${songId}`, {
      method: 'DELETE'
    })
  },

  // Playlists
  async getPlaylists() {
    return fetchWithAuth('/playlists')
  },

  async createPlaylist(playlist) {
    return fetchWithAuth('/playlists', {
      method: 'POST',
      body: JSON.stringify(playlist)
    })
  },

  async updatePlaylist(playlistId, updates) {
    return fetchWithAuth(`/playlists/${playlistId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    })
  },

  async deletePlaylist(playlistId) {
    return fetchWithAuth(`/playlists/${playlistId}`, {
      method: 'DELETE'
    })
  },

  // Play History
  async getHistory(limit = 50) {
    return fetchWithAuth(`/history?limit=${limit}`)
  },

  async logPlay(songId, durationWatched = null, completed = false) {
    return fetchWithAuth('/history', {
      method: 'POST',
      body: JSON.stringify({ songId, durationWatched, completed })
    })
  }
}

export default api
