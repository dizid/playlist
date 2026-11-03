// Read-only clients for services that keep a user's listening history ("scrobbles").
// Last.fm and ListenBrainz both collect plays from Spotify, YouTube Music, Apple Music etc.,
// so one username gives TuneCraft the whole play history without any file exports.
import { config } from 'dotenv'

// Load .env file for local development
config()

export type Provider = 'lastfm' | 'listenbrainz'
export const PROVIDERS: Provider[] = ['lastfm', 'listenbrainz']

export function isProvider(value: unknown): value is Provider {
  return typeof value === 'string' && (PROVIDERS as string[]).includes(value)
}

// One listen, normalized across providers
export interface Play {
  artist: string
  title: string
  album: string | null
  playedAt: number          // unix seconds
  thumbnail: string | null
}

export interface ProviderProfile {
  username: string          // canonical spelling from the provider
  totalPlays: number | null
}

// userFacing errors (unknown user, private profile) are shown to the user as-is;
// everything else is logged and shown as a generic "try again later".
export class ProviderError extends Error {
  constructor(message: string, readonly userFacing = false) {
    super(message)
    this.name = 'ProviderError'
  }
}

// One batch of plays; hasMore = the provider has more plays further in that direction
export interface PlayBatch {
  plays: Play[]
  hasMore: boolean
}

export interface ScrobbleClient {
  // Pause between requests to stay well inside the provider's rate limits
  readonly requestDelayMs: number
  getProfile(username: string): Promise<ProviderProfile>
  // Newest plays with playedAt <= beforeTs (newest overall when null). Inclusive, so plays sharing
  // the boundary second are never skipped; the sync engine dedupes the overlap.
  getPlaysAtOrBefore(username: string, beforeTs: number | null): Promise<PlayBatch>
  // The oldest plays with playedAt >= afterTs. Inclusive for the same reason.
  getPlaysAtOrAfter(username: string, afterTs: number): Promise<PlayBatch>
}

// Kept short: a sync run must finish inside Netlify's 10s function limit
const REQUEST_TIMEOUT_MS = 5000
const USER_AGENT = 'TuneCraft/1.0 (https://tunecraft.music)'

// ---------------------------------------------------------------------------
// Last.fm
// ---------------------------------------------------------------------------

const LASTFM_BASE_URL = 'https://ws.audioscrobbler.com/2.0/'
const LASTFM_PAGE_SIZE = 200 // API maximum for user.getRecentTracks

// Last.fm serves this grey star image when it has no artwork
const LASTFM_PLACEHOLDER_IMAGE = '2a96cbd8b46e442fc41c2b86b821562f'

// Get API key - try Netlify.env first (production), then process.env (local dev)
function getLastfmApiKey(): string {
  return (typeof Netlify !== 'undefined' && Netlify.env?.get('LASTFM_API_KEY'))
    || process.env.LASTFM_API_KEY
    || ''
}

interface LastfmImage { size?: string, '#text'?: string }
export interface LastfmTrack {
  name?: string
  artist?: { name?: string, '#text'?: string }
  album?: { '#text'?: string }
  image?: LastfmImage[]
  date?: { uts?: string }
  '@attr'?: { nowplaying?: string }
}

// Pick the largest real artwork, ignoring Last.fm's placeholder star
function pickLastfmImage(images: LastfmImage[] | undefined): string | null {
  if (!Array.isArray(images)) return null
  for (const size of ['extralarge', 'large', 'medium']) {
    const url = images.find(img => img.size === size)?.['#text']
    if (url && !url.includes(LASTFM_PLACEHOLDER_IMAGE)) return url
  }
  return null
}

// Convert one getRecentTracks item; null for the "now playing" entry (no timestamp yet) or junk
export function normalizeLastfmTrack(track: LastfmTrack): Play | null {
  if (track['@attr']?.nowplaying === 'true') return null
  const playedAt = Number(track.date?.uts)
  const artist = (track.artist?.name ?? track.artist?.['#text'] ?? '').trim()
  const title = (track.name ?? '').trim()
  if (!Number.isFinite(playedAt) || playedAt <= 0 || !artist || !title) return null

  return {
    artist,
    title,
    album: track.album?.['#text']?.trim() || null,
    playedAt,
    thumbnail: pickLastfmImage(track.image)
  }
}

// Last.fm returns a single object instead of an array when there is exactly one track
export function lastfmTrackList(track: LastfmTrack | LastfmTrack[] | undefined): LastfmTrack[] {
  if (!track) return []
  return Array.isArray(track) ? track : [track]
}

async function lastfmRequest(params: Record<string, string>): Promise<Record<string, unknown>> {
  const apiKey = getLastfmApiKey()
  if (!apiKey) throw new ProviderError('LASTFM_API_KEY is not configured')

  const url = new URL(LASTFM_BASE_URL)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('format', 'json')

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  })
  const data = await response.json().catch(() => ({})) as Record<string, unknown>

  // Last.fm reports errors as { error: <code>, message } (often with HTTP 200)
  if (typeof data.error === 'number') {
    if (data.error === 6) throw new ProviderError('Last.fm user not found. Check the spelling of the username.', true)
    if (data.error === 17) {
      throw new ProviderError('This Last.fm profile hides its listening history. Turn off "Hide recent listening information" in Last.fm privacy settings, then sync again.', true)
    }
    throw new ProviderError(`Last.fm error ${data.error}: ${data.message ?? 'unknown'}`)
  }
  if (!response.ok) throw new ProviderError(`Last.fm HTTP ${response.status}`)
  return data
}

interface LastfmRecentTracks {
  recenttracks?: { track?: LastfmTrack | LastfmTrack[], '@attr'?: { totalPages?: string } }
}

async function lastfmRecentTracks(username: string, extra: Record<string, string>) {
  const data = await lastfmRequest({
    method: 'user.getrecenttracks',
    user: username,
    limit: String(LASTFM_PAGE_SIZE),
    ...extra
  }) as LastfmRecentTracks
  const plays = lastfmTrackList(data.recenttracks?.track)
    .map(normalizeLastfmTrack)
    .filter((play): play is Play => play !== null)
  const totalPages = Number(data.recenttracks?.['@attr']?.totalPages) || 0
  return { plays, totalPages }
}

export const lastfmClient: ScrobbleClient = {
  requestDelayMs: 250,

  async getProfile(username) {
    const data = await lastfmRequest({ method: 'user.getinfo', user: username }) as {
      user?: { name?: string, playcount?: string }
    }
    if (!data.user?.name) throw new ProviderError('Last.fm user not found. Check the spelling of the username.', true)
    // Fetch one play too: getinfo works for private profiles, getrecenttracks does not
    await lastfmRecentTracks(data.user.name, { limit: '1' })
    return { username: data.user.name, totalPlays: Number(data.user.playcount) || null }
  },

  async getPlaysAtOrBefore(username, beforeTs) {
    const extra: Record<string, string> = { page: '1' }
    if (beforeTs !== null) extra.to = String(beforeTs)
    const { plays, totalPages } = await lastfmRecentTracks(username, extra)
    return { plays, hasMore: totalPages > 1 }
  },

  async getPlaysAtOrAfter(username, afterTs) {
    // Pages run newest -> oldest, so the oldest plays after the cursor sit on the LAST page.
    // That page can be short while newer pages exist, hence hasMore comes from totalPages.
    const from = String(afterTs)
    const first = await lastfmRecentTracks(username, { from, page: '1' })
    if (first.totalPages <= 1) return { plays: first.plays, hasMore: false }
    await new Promise(resolve => setTimeout(resolve, this.requestDelayMs))
    const oldest = await lastfmRecentTracks(username, { from, page: String(first.totalPages) })
    return { plays: oldest.plays, hasMore: true }
  }
}

// ---------------------------------------------------------------------------
// ListenBrainz (open data, no API key needed for public listens)
// ---------------------------------------------------------------------------

const LISTENBRAINZ_BASE_URL = 'https://api.listenbrainz.org/1'
const LISTENBRAINZ_PAGE_SIZE = 1000 // API maximum for /listens

export interface ListenBrainzListen {
  listened_at?: number
  track_metadata?: {
    artist_name?: string
    track_name?: string
    release_name?: string
    mbid_mapping?: { caa_id?: number, caa_release_mbid?: string }
  }
}

export function normalizeListenBrainzListen(listen: ListenBrainzListen): Play | null {
  const meta = listen.track_metadata
  const playedAt = Number(listen.listened_at)
  const artist = (meta?.artist_name ?? '').trim()
  const title = (meta?.track_name ?? '').trim()
  if (!Number.isFinite(playedAt) || playedAt <= 0 || !artist || !title) return null

  // Cover Art Archive thumbnail when ListenBrainz matched the listen to a release
  const caa = meta?.mbid_mapping
  const thumbnail = caa?.caa_id && caa?.caa_release_mbid
    ? `https://coverartarchive.org/release/${caa.caa_release_mbid}/${caa.caa_id}-250.jpg`
    : null

  return { artist, title, album: meta?.release_name?.trim() || null, playedAt, thumbnail }
}

async function listenBrainzRequest(path: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${LISTENBRAINZ_BASE_URL}${path}`, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  })
  if (response.status === 404) {
    throw new ProviderError('ListenBrainz user not found. Check the spelling of the username.', true)
  }
  if (!response.ok) throw new ProviderError(`ListenBrainz HTTP ${response.status}`)
  return await response.json() as Record<string, unknown>
}

async function listenBrainzListens(username: string, query: Record<string, string>): Promise<PlayBatch> {
  const params = new URLSearchParams({ count: String(LISTENBRAINZ_PAGE_SIZE), ...query })
  const data = await listenBrainzRequest(`/user/${encodeURIComponent(username)}/listens?${params}`) as {
    payload?: { listens?: ListenBrainzListen[] }
  }
  const listens = data.payload?.listens ?? []
  return {
    plays: listens.map(normalizeListenBrainzListen).filter((play): play is Play => play !== null),
    // A full page means there may be more (counted before dropping junk listens)
    hasMore: listens.length >= LISTENBRAINZ_PAGE_SIZE
  }
}

export const listenBrainzClient: ScrobbleClient = {
  requestDelayMs: 1000, // ListenBrainz asks clients to stay around 1 request per second

  async getProfile(username) {
    const data = await listenBrainzRequest(`/user/${encodeURIComponent(username)}/listen-count`) as {
      payload?: { count?: number }
    }
    // The API has no "canonical name" endpoint; usernames are matched exactly
    return { username, totalPlays: data.payload?.count ?? null }
  },

  // max_ts / min_ts are exclusive in the ListenBrainz API, so widen by one second
  async getPlaysAtOrBefore(username, beforeTs) {
    return listenBrainzListens(username, beforeTs === null ? {} : { max_ts: String(beforeTs + 1) })
  },

  async getPlaysAtOrAfter(username, afterTs) {
    // With min_ts, ListenBrainz returns the listens right after it (oldest batch first)
    return listenBrainzListens(username, { min_ts: String(afterTs - 1) })
  }
}

export function getScrobbleClient(provider: Provider): ScrobbleClient {
  return provider === 'lastfm' ? lastfmClient : listenBrainzClient
}

// Placeholder youtube_id for songs that have no YouTube video yet.
// MUST stay identical to the inline versions in songs.mts and import-process-background.mts,
// so a song from Shazam, Last.fm and ListenBrainz all land on the same row.
export function placeholderYouTubeId(artist: string, title: string): string {
  const hashInput = `${artist}:${title}`.toLowerCase()
  const hash = Array.from(hashInput).reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0) | 0, 0)
  return `shz${Math.abs(hash).toString(36).slice(0, 8)}`
}
