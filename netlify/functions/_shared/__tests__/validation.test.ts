// Input checks added in the T-0636 security pass (Nov 21 2026)
import { describe, it, expect } from 'vitest'
import {
  isAllowedPushEndpoint,
  isImportType,
  isValidYouTubeId,
  checkOptionalText,
  checkRequiredText,
  checkOptionalStringList,
  checkOptionalSongIds,
  checkOptionalRules,
  escapeHtml,
  LIMITS
} from '../validation'

describe('isAllowedPushEndpoint', () => {
  it('accepts the browsers\' push services', () => {
    const real = [
      'https://fcm.googleapis.com/fcm/send/dQw4w9WgXcQ:APA91bH-example',
      'https://fcm.googleapis.com/wp/dQw4w9WgXcQ',
      'https://android.googleapis.com/gcm/send/abc',
      'https://updates.push.services.mozilla.com/wpush/v2/gAAAAABexample',
      'https://web.push.apple.com/QGuQyavXutnMH6Example',
      'https://wns2-par02p.notify.windows.com/w/?token=BQYAAAexample',
      'https://fcm.googleapis.com:443/fcm/send/abc' // default port written out
    ]
    for (const endpoint of real) expect(isAllowedPushEndpoint(endpoint), endpoint).toBe(true)
  })

  it('refuses everything else', () => {
    const bad = [
      'http://fcm.googleapis.com/fcm/send/abc',          // not https
      'https://fcm.googleapis.com:8443/fcm/send/abc',    // other port
      'https://user:pw@fcm.googleapis.com/fcm/send/abc', // credentials
      'https://fcm.googleapis.com.evil.example/x',       // look-alike host
      'https://evilfcm.googleapis.com.example/x',
      'https://notgoogleapis.com/x',
      'https://evilnotify.windows.com.example/x',
      'https://127.0.0.1/x',
      'https://169.254.169.254/latest/meta-data',
      'https://localhost/x',
      'https://example.com/push',
      'javascript:alert(1)',
      'not a url',
      '',
      'https://fcm.googleapis.com/' + 'a'.repeat(LIMITS.pushEndpoint)
    ]
    for (const endpoint of bad) expect(isAllowedPushEndpoint(endpoint), endpoint).toBe(false)
    expect(isAllowedPushEndpoint(undefined)).toBe(false)
    expect(isAllowedPushEndpoint(42)).toBe(false)
    expect(isAllowedPushEndpoint({ href: 'https://fcm.googleapis.com/x' })).toBe(false)
  })
})

describe('isImportType', () => {
  it('accepts only the 4 types the Import page sends', () => {
    for (const type of ['youtube_playlists', 'youtube_likes', 'shazam', 'takeout']) {
      expect(isImportType(type)).toBe(true)
    }
    for (const type of ['<a href=//x.co>hi</a>', 'spotify', '', 'SHAZAM', null, 1, ['shazam']]) {
      expect(isImportType(type)).toBe(false)
    }
  })
})

describe('isValidYouTubeId', () => {
  it('accepts 1-11 URL-safe characters only', () => {
    expect(isValidYouTubeId('dQw4w9WgXcQ')).toBe(true)
    expect(isValidYouTubeId('a-_9')).toBe(true)
    expect(isValidYouTubeId('dQw4w9WgXcQx')).toBe(false) // 12 chars: DB column is VARCHAR(11)
    expect(isValidYouTubeId('abc/def')).toBe(false)
    expect(isValidYouTubeId('')).toBe(false)
    expect(isValidYouTubeId(12345)).toBe(false)
  })
})

describe('text checks', () => {
  it('optional text: missing passes, wrong type or too long fails', () => {
    expect(checkOptionalText(undefined, 'artist', 5)).toBeNull()
    expect(checkOptionalText(null, 'artist', 5)).toBeNull()
    expect(checkOptionalText('', 'artist', 5)).toBeNull()
    expect(checkOptionalText('abcde', 'artist', 5)).toBeNull()
    expect(checkOptionalText('abcdef', 'artist', 5)).toMatch(/too long/)
    expect(checkOptionalText(123, 'artist', 5)).toMatch(/must be text/)
    expect(checkOptionalText({}, 'artist', 5)).toMatch(/must be text/)
  })

  it('required text: blank, missing or wrong type fails', () => {
    expect(checkRequiredText('Song', 'title', 10)).toBeNull()
    expect(checkRequiredText('   ', 'title', 10)).toMatch(/Missing required field: title/)
    expect(checkRequiredText(undefined, 'title', 10)).toMatch(/Missing/)
    expect(checkRequiredText(['Song'], 'title', 10)).toMatch(/Missing/)
    expect(checkRequiredText('x'.repeat(11), 'title', 10)).toMatch(/too long/)
  })
})

describe('checkOptionalStringList (genres, moods)', () => {
  it('passes what the tag editor sends', () => {
    expect(checkOptionalStringList(['rock', 'r&b', 'hip-hop'], 'genres', 20, 50)).toBeNull()
    expect(checkOptionalStringList([], 'genres', 20, 50)).toBeNull()
    expect(checkOptionalStringList(undefined, 'genres', 20, 50)).toBeNull()
    expect(checkOptionalStringList(null, 'genres', 20, 50)).toBeNull()
  })

  it('refuses non-lists, too many items, non-text and long items', () => {
    expect(checkOptionalStringList('rock', 'genres', 20, 50)).toMatch(/must be a list/)
    expect(checkOptionalStringList({ 0: 'rock' }, 'genres', 20, 50)).toMatch(/must be a list/)
    expect(checkOptionalStringList(Array(21).fill('rock'), 'genres', 20, 50)).toMatch(/max 20/)
    expect(checkOptionalStringList(['rock', 5], 'genres', 20, 50)).toMatch(/each item/)
    expect(checkOptionalStringList(['x'.repeat(51)], 'genres', 20, 50)).toMatch(/each item/)
  })
})

describe('playlist checks', () => {
  const uuid = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'

  it('songIds: UUID lists only, up to the limit', () => {
    expect(checkOptionalSongIds(undefined)).toBeNull()
    expect(checkOptionalSongIds(null)).toBeNull()
    expect(checkOptionalSongIds([uuid])).toBeNull()
    expect(checkOptionalSongIds(Array(LIMITS.playlistSongs).fill(uuid))).toBeNull()
    expect(checkOptionalSongIds(Array(LIMITS.playlistSongs + 1).fill(uuid))).toMatch(/max/)
    expect(checkOptionalSongIds([uuid, 'nope'])).toMatch(/invalid song ID/)
    expect(checkOptionalSongIds(uuid)).toMatch(/must be a list/)
  })

  it('rules: the app\'s default smart playlists pass; non-objects and huge rules fail', () => {
    expect(checkOptionalRules({ sortBy: 'created_at', sortOrder: 'desc', minPlayCount: 2, limit: 50 })).toBeNull()
    expect(checkOptionalRules(undefined)).toBeNull()
    expect(checkOptionalRules(null)).toBeNull()
    expect(checkOptionalRules('sortBy=popularity')).toMatch(/must be an object/)
    expect(checkOptionalRules([1, 2])).toMatch(/must be an object/)
    expect(checkOptionalRules({ genres: Array(1000).fill('electronic') })).toMatch(/too large/)
  })
})

describe('escapeHtml', () => {
  it('escapes the 5 HTML characters', () => {
    expect(escapeHtml('<a href="x">Tom & Jerry\'s</a>')).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;')
    expect(escapeHtml('Google Takeout')).toBe('Google Takeout')
    expect(escapeHtml(undefined)).toBe('')
  })
})
