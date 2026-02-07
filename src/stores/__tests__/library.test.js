import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLibraryStore } from '../library'

// Mock the API module
vi.mock('../../services/api', () => ({
  api: {
    getSongs: vi.fn(),
    addSong: vi.fn(),
    getPlaylists: vi.fn()
  }
}))

import { api } from '../../services/api'

describe('useLibraryStore', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useLibraryStore()
    vi.clearAllMocks()
  })

  describe('topSongs', () => {
    it('sorts songs by popularity descending', () => {
      store.songs = [
        { id: '1', title: 'Low Pop', popularity: 10 },
        { id: '2', title: 'High Pop', popularity: 90 },
        { id: '3', title: 'Mid Pop', popularity: 50 }
      ]

      const top = store.topSongs
      expect(top[0].title).toBe('High Pop')
      expect(top[1].title).toBe('Mid Pop')
      expect(top[2].title).toBe('Low Pop')
    })

    it('limits results to 50 songs', () => {
      // Create 60 songs with ascending popularity
      store.songs = Array.from({ length: 60 }, (_, i) => ({
        id: String(i),
        title: `Song ${i}`,
        popularity: i
      }))

      expect(store.topSongs).toHaveLength(50)
      // Most popular song (popularity=59) should be first
      expect(store.topSongs[0].popularity).toBe(59)
    })

    it('returns empty array when no songs', () => {
      expect(store.topSongs).toEqual([])
    })
  })

  describe('addSong', () => {
    it('adds a new song to the store', async () => {
      const newSong = {
        id: 'abc-123',
        youtube_id: 'yt_123',
        title: 'Test Song',
        artist: 'Test Artist'
      }

      api.addSong.mockResolvedValue(newSong)

      const result = await store.addSong({
        youtubeId: 'yt_123',
        title: 'Test Song',
        artist: 'Test Artist'
      })

      expect(result).toEqual(newSong)
      expect(store.songs).toContainEqual(newSong)
      expect(api.addSong).toHaveBeenCalledOnce()
    })

    it('updates existing song if youtube_id matches', async () => {
      // Pre-populate store with an existing song
      store.songs = [
        { id: 'abc-123', youtube_id: 'yt_123', title: 'Old Title', artist: 'Old Artist' }
      ]

      const updatedSong = {
        id: 'abc-123',
        youtube_id: 'yt_123',
        title: 'New Title',
        artist: 'New Artist'
      }

      api.addSong.mockResolvedValue(updatedSong)

      await store.addSong({
        youtubeId: 'yt_123',
        title: 'New Title',
        artist: 'New Artist'
      })

      expect(store.songs).toHaveLength(1)
      expect(store.songs[0].title).toBe('New Title')
    })

    it('sets error on failure', async () => {
      api.addSong.mockRejectedValue(new Error('Network error'))

      await expect(store.addSong({ title: 'Fail Song' })).rejects.toThrow('Network error')
      expect(store.error).toBe('Network error')
    })
  })

  describe('fetchSongs', () => {
    it('fetches songs and updates store with pagination', async () => {
      const mockSongs = [
        { id: '1', title: 'Song A' },
        { id: '2', title: 'Song B' }
      ]

      api.getSongs.mockResolvedValue({
        songs: mockSongs,
        pagination: { page: 1, limit: 50, total: 2, totalPages: 1 }
      })

      await store.fetchSongs()

      expect(store.songs).toEqual(mockSongs)
      expect(store.pagination.total).toBe(2)
      expect(store.pagination.totalPages).toBe(1)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('passes page and limit to API', async () => {
      api.getSongs.mockResolvedValue({
        songs: [],
        pagination: { page: 2, limit: 20, total: 30, totalPages: 2 }
      })

      await store.fetchSongs({ page: 2, limit: 20 })

      expect(api.getSongs).toHaveBeenCalledWith({}, { page: 2, limit: 20 })
    })

    it('sets error on fetch failure', async () => {
      api.getSongs.mockRejectedValue(new Error('Fetch failed'))

      await store.fetchSongs()

      expect(store.error).toBe('Fetch failed')
      expect(store.isLoading).toBe(false)
    })
  })
})
