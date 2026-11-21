// Shared validation utilities

// UUID v4 format validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id)
}

// ---------------------------------------------------------------------------
// Input limits (T-0636 security pass, Nov 21 2026)
// Netlify accepts request bodies up to 6 MB, and before these checks all of it
// could be stored in a song or playlist. The limits are far above real use
// (live data Nov 21: longest title 99 chars, artist 49, thumbnail URL 46,
// max 3 tags per song of max 4 chars) and above what the app itself sends.
// ---------------------------------------------------------------------------

export const LIMITS = {
  songTitle: 500,
  songArtist: 300,
  songChannel: 300,
  songThumbnail: 1000,
  songSource: 20,        // songs.source is VARCHAR(20)
  tags: 20,              // genres or moods per song
  tagLength: 50,
  playlistName: 200,
  playlistRulesJson: 4000,
  playlistSongs: 5000,   // same as the biggest import batch
  pushEndpoint: 1000,
  pushKey: 200,          // p256dh is ~87 chars, auth ~22
  userAgent: 500
} as const

/** A YouTube video id as stored in songs.youtube_id (VARCHAR(11)). */
const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{1,11}$/

export function isValidYouTubeId(value: unknown): value is string {
  return typeof value === 'string' && YOUTUBE_ID_REGEX.test(value)
}

/**
 * Optional text field: undefined/null/'' pass; otherwise it must be a string of
 * at most maxLength characters. Returns an error message or null.
 */
export function checkOptionalText(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') return `${field} must be text`
  if (value.length > maxLength) return `${field} is too long (max ${maxLength} characters)`
  return null
}

/** Required text field: a non-blank string of at most maxLength characters. */
export function checkRequiredText(value: unknown, field: string, maxLength: number): string | null {
  if (typeof value !== 'string' || value.trim() === '') return `Missing required field: ${field}`
  if (value.length > maxLength) return `${field} is too long (max ${maxLength} characters)`
  return null
}

/**
 * Optional list of short strings (genres, moods): undefined/null pass (the
 * caller keeps the stored value); otherwise an array of at most maxItems
 * strings of at most maxLength characters each.
 */
export function checkOptionalStringList(value: unknown, field: string, maxItems: number, maxLength: number): string | null {
  if (value === undefined || value === null) return null
  if (!Array.isArray(value)) return `${field} must be a list`
  if (value.length > maxItems) return `${field}: max ${maxItems} items allowed`
  if (value.some((item) => typeof item !== 'string' || item.length > maxLength)) {
    return `${field}: each item must be text of max ${maxLength} characters`
  }
  return null
}

/** Optional list of song ids (manual playlists): undefined/null pass; else UUIDs only. */
export function checkOptionalSongIds(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (!Array.isArray(value)) return 'songIds must be a list'
  if (value.length > LIMITS.playlistSongs) return `songIds: max ${LIMITS.playlistSongs} songs allowed`
  if (value.some((id) => typeof id !== 'string' || !isValidUuid(id))) return 'songIds: invalid song ID'
  return null
}

/** Optional smart-playlist rules: undefined/null pass; else a plain object of limited size. */
export function checkOptionalRules(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'object' || Array.isArray(value)) return 'rules must be an object'
  if (JSON.stringify(value).length > LIMITS.playlistRulesJson) return 'rules are too large'
  return null
}

// The import types the Import page sends (import_jobs.type). The type is also
// shown in the completion email and push message, so nothing else is accepted.
export const IMPORT_TYPES = ['youtube_playlists', 'youtube_likes', 'shazam', 'takeout'] as const

export function isImportType(value: unknown): value is typeof IMPORT_TYPES[number] {
  return typeof value === 'string' && (IMPORT_TYPES as readonly string[]).includes(value)
}

// ---------------------------------------------------------------------------
// Push subscription endpoints
// After an import the server POSTs a notification to every stored endpoint of
// the user. Any URL used to be accepted, so a signed-in user could make the
// server send requests to any https address (including internal ones). Only
// the browsers' own push services are accepted now:
//   Chrome, Edge on Android, Brave, Opera, Samsung Internet -> fcm.googleapis.com
//   Firefox -> updates.push.services.mozilla.com
//   Safari (macOS 13+, iOS 16.4+) -> web.push.apple.com
//   Edge on Windows -> *.notify.windows.com
// ---------------------------------------------------------------------------

const PUSH_SERVICE_HOSTS = [
  'fcm.googleapis.com',
  'android.googleapis.com',
  'push.services.mozilla.com',
  'push.apple.com',
  'notify.windows.com'
]

export function isAllowedPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== 'string' || endpoint.length > LIMITS.pushEndpoint) return false
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }
  // https on the default port only, no user:password@ part
  if (url.protocol !== 'https:' || url.port !== '' || url.username !== '' || url.password !== '') return false
  const host = url.hostname.toLowerCase()
  return PUSH_SERVICE_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
}

/** Escape text for use inside an HTML email body. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
