// API service for TuneCraft
// Handles all server-side API calls with authentication

import { getSessionToken, getUserId } from './auth-client'

// Fetch wrapper with authentication
async function fetchWithAuth(endpoint, options = {}) {
  const token = await getSessionToken()
  const userId = getUserId()

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-User-Id': userId || '',
      ...options.headers
    }
  })

  // Handle unauthorized - could trigger re-auth flow
  if (response.status === 401) {
    throw new Error('Unauthorized - please log in again')
  }

  if (!response.ok) {
    // Try to parse as JSON directly (vite plugin strips Content-Type headers)
    let errorMessage = `API error: ${response.status}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorMessage
    } catch {
      // JSON parsing failed, try text
      try {
        const text = await response.text()
        if (text) errorMessage = `${response.status}: ${text.slice(0, 100)}`
      } catch {
        // Text parsing failed, use default message
      }
    }

    throw new Error(errorMessage)
  }

  // Try to parse as JSON (vite plugin sometimes strips Content-Type headers)
  try {
    return await response.json()
  } catch {
    const text = await response.text()
    throw new Error(`Failed to parse response as JSON: ${text.slice(0, 100)}`)
  }
}

export const api = {
  // Songs
  async getSongs(filters = {}) {
    const params = new URLSearchParams()
    if (filters.genres?.length) params.set('genres', filters.genres.join(','))
    if (filters.moods?.length) params.set('moods', filters.moods.join(','))

    const query = params.toString()
    return fetchWithAuth(`/songs${query ? '?' + query : ''}`)
  },

  async addSong(song) {
    return fetchWithAuth('/songs', {
      method: 'POST',
      body: JSON.stringify(song)
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

  async updateSongTags(songId, { genres, moods }) {
    return fetchWithAuth(`/songs/${songId}`, {
      method: 'PATCH',
      body: JSON.stringify({ genres, moods })
    })
  },

  // Enrichment
  async enrichSongs(options = {}) {
    return fetchWithAuth('/enrich', {
      method: 'POST',
      body: JSON.stringify(options)
    })
  },

  async getEnrichmentStatus() {
    return fetchWithAuth('/enrich/status')
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
  },

  // Data Management
  async exportData() {
    return fetchWithAuth('/data/export')
  },

  async deleteAllData() {
    return fetchWithAuth('/data', {
      method: 'DELETE'
    })
  },

  // Import Jobs (background processing)
  async createImportJob({ type, songs, notifyEmail = true, notifyPush = true, email = null }) {
    return fetchWithAuth('/import/batch', {
      method: 'POST',
      body: JSON.stringify({ type, songs, notifyEmail, notifyPush, email })
    })
  },

  async getImportJobStatus(jobId) {
    return fetchWithAuth(`/import/status/${jobId}`)
  },

  async getActiveImportJob() {
    return fetchWithAuth('/import/active')
  },

  async getImportHistory() {
    return fetchWithAuth('/import/history')
  }
}

export default api
