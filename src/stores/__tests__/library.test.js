import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLibraryStore } from '../library'

// Mock the API module
vi.mock('../../services/api', () => ({
  api: {
    getSongs: vi.fn(),
    addSong: vi.fn(),
    getPlaylists: vi.fn(),
    createPlaylist: vi.fn(),
    incrementPlayCount: vi.fn()
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
  // Audit 2026-11-12 (T-0462): counts over the whole library, one play per tap.
  describe('library totals and plays', () => {
    it('songCount is the server total, not the size of the loaded page', async () => {
      api.getSongs.mockResolvedValue({
        songs: [{ id: '1' }, { id: '2' }],
        pagination: { page: 1, limit: 200, total: 1234, totalPages: 7 },
        totalPlays: 5678
      })

      await store.fetchSongs()

      expect(store.songCount).toBe(1234)
      expect(store.totalPlays).toBe(5678)
    })

    it('songCount falls back to the loaded songs before a count is known', () => {
      store.songs = [{ id: '1' }, { id: '2' }, { id: '3' }]
      expect(store.songCount).toBe(3)
    })

    it('incrementPlayCount only updates the screen (the logged play already counted it)', () => {
      store.songs = [{ id: 'a', play_count: 4 }]

      store.incrementPlayCount('a')

      expect(store.songs[0].play_count).toBe(5)
      expect(api.incrementPlayCount).not.toHaveBeenCalled()
    })
  })

  describe('ensureDefaultPlaylists', () => {
    beforeEach(() => {
      window.localStorage.clear()
      let n = 0
      api.createPlaylist.mockImplementation(async (p) => ({ id: `p${++n}`, ...p }))
    })

    it('creates Top 50, Heavy Rotation and Fresh Loves for a user with songs and no playlists', async () => {
      store.songs = [{ id: 's1', title: 'Song' }]
      api.getPlaylists.mockResolvedValue([])

      await store.ensureDefaultPlaylists('user-1')

      expect(api.createPlaylist).toHaveBeenCalledTimes(3)
      expect(store.playlists.map(p => p.name)).toEqual(['Top 50', 'Heavy Rotation', 'Fresh Loves'])
      // No rating or popularity rules: those values are never filled in
      for (const [p] of api.createPlaylist.mock.calls) {
        expect(p.type).toBe('smart')
        expect(['play_count', 'last_played', 'created_at']).toContain(p.rules.sortBy)
        expect(p.rules.minPopularity).toBeUndefined()
      }
    })

    it('makes only one set when the Dashboard opens twice quickly', async () => {
      store.songs = [{ id: 's1', title: 'Song' }]
      api.getPlaylists.mockResolvedValue([])

      await Promise.all([store.ensureDefaultPlaylists('user-1'), store.ensureDefaultPlaylists('user-1')])

      expect(api.createPlaylist).toHaveBeenCalledTimes(3)
    })

    it('creates nothing when the server already has playlists (failed earlier fetch)', async () => {
      store.songs = [{ id: 's1', title: 'Song' }]
      api.getPlaylists.mockResolvedValue([{ id: 'x', name: 'Mine' }])

      await store.ensureDefaultPlaylists('user-1')

      expect(api.createPlaylist).not.toHaveBeenCalled()
      expect(store.playlists).toEqual([{ id: 'x', name: 'Mine' }])
    })

    it('does nothing for an empty library or after a set was made on this device', async () => {
      api.getPlaylists.mockResolvedValue([])
      await store.ensureDefaultPlaylists('user-1')
      expect(api.createPlaylist).not.toHaveBeenCalled()

      store.songs = [{ id: 's1', title: 'Song' }]
      window.localStorage.setItem('tunecraft:default-playlists:user-1', '1')
      await store.ensureDefaultPlaylists('user-1')
      expect(api.createPlaylist).not.toHaveBeenCalled()
    })
  })
  describe('searchSongs (whole-library search)', () => {
    it('asks the server with q and keeps songs, pagination and totals untouched', async () => {
      store.songs = [{ id: 'loaded' }]
      store.pagination = { page: 1, limit: 200, total: 900, totalPages: 5 }
      api.getSongs.mockResolvedValueOnce({ songs: [{ id: 'deep', title: 'Deep Cut' }], pagination: { total: 1 }, totalPlays: 3 })

      await store.searchSongs('  deep  ')

      expect(api.getSongs).toHaveBeenCalledWith({ q: 'deep' }, { page: 1, limit: 200 })
      expect(store.searchResults).toEqual({ query: 'deep', songs: [{ id: 'deep', title: 'Deep Cut' }], total: 1 })
      expect(store.songs).toEqual([{ id: 'loaded' }])
      expect(store.pagination.total).toBe(900)
      expect(store.isSearching).toBe(false)
    })

    it('ignores a late answer to an older query', async () => {
      let resolveOld
      api.getSongs
        .mockReturnValueOnce(new Promise((r) => { resolveOld = r }))
        .mockResolvedValueOnce({ songs: [{ id: 'new' }], pagination: { total: 1 } })

      const older = store.searchSongs('old')
      await store.searchSongs('new')
      resolveOld({ songs: [{ id: 'old' }], pagination: { total: 1 } })
      await older

      expect(store.searchResults.query).toBe('new')
      expect(store.searchResults.songs).toEqual([{ id: 'new' }])
    })

    it('an empty query clears the search without calling the server', async () => {
      store.searchResults = { query: 'x', songs: [], total: 0 }
      await store.searchSongs('   ')
      expect(api.getSongs).not.toHaveBeenCalled()
      expect(store.searchResults).toBeNull()
    })
  })
})
