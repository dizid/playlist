// Last.fm API integration for genre/mood enrichment
import { config } from 'dotenv'

// Load .env file for local development
config()

// Get API key - try Netlify.env first (production), then process.env (local dev)
function getLastfmApiKey(): string {
  return (typeof Netlify !== 'undefined' && Netlify.env?.get('LASTFM_API_KEY'))
    || process.env.LASTFM_API_KEY
    || ''
}
const LASTFM_BASE_URL = 'https://ws.audioscrobbler.com/2.0/'

// Genre taxonomy - maps Last.fm tags to our standardized genres
const GENRE_MAP: Record<string, string> = {
  // Rock variants
  'rock': 'rock',
  'alternative rock': 'rock',
  'indie rock': 'rock',
  'hard rock': 'rock',
  'punk rock': 'rock',
  'punk': 'rock',
  'grunge': 'rock',
  'classic rock': 'rock',
  'progressive rock': 'rock',
  'psychedelic rock': 'rock',
  'soft rock': 'rock',

  // Pop variants
  'pop': 'pop',
  'synthpop': 'pop',
  'dance pop': 'pop',
  'electropop': 'pop',
  'k-pop': 'pop',
  'j-pop': 'pop',
  'teen pop': 'pop',
  'power pop': 'pop',

  // Electronic variants
  'electronic': 'electronic',
  'electronica': 'electronic',
  'edm': 'electronic',
  'house': 'electronic',
  'techno': 'electronic',
  'trance': 'electronic',
  'dubstep': 'electronic',
  'drum and bass': 'electronic',
  'dnb': 'electronic',
  'ambient': 'electronic',
  'downtempo': 'electronic',
  'idm': 'electronic',
  'electro': 'electronic',

  // Hip-hop variants
  'hip-hop': 'hip-hop',
  'hip hop': 'hip-hop',
  'rap': 'hip-hop',
  'trap': 'hip-hop',
  'boom bap': 'hip-hop',

  // R&B variants
  'r&b': 'r&b',
  'rnb': 'r&b',
  'soul': 'r&b',
  'neo-soul': 'r&b',
  'funk': 'r&b',

  // Jazz variants
  'jazz': 'jazz',
  'smooth jazz': 'jazz',
  'jazz fusion': 'jazz',
  'bebop': 'jazz',
  'swing': 'jazz',

  // Metal variants
  'metal': 'metal',
  'heavy metal': 'metal',
  'death metal': 'metal',
  'black metal': 'metal',
  'thrash metal': 'metal',
  'metalcore': 'metal',
  'nu metal': 'metal',
  'progressive metal': 'metal',

  // Indie variants
  'indie': 'indie',
  'indie pop': 'indie',
  'lo-fi': 'indie',
  'bedroom pop': 'indie',
  'shoegaze': 'indie',
  'dream pop': 'indie',

  // Folk variants
  'folk': 'folk',
  'folk rock': 'folk',
  'acoustic': 'folk',
  'singer-songwriter': 'folk',
  'americana': 'folk',
  'country': 'folk',
  'bluegrass': 'folk',

  // Classical variants
  'classical': 'classical',
  'orchestra': 'classical',
  'symphonic': 'classical',
  'piano': 'classical',
  'instrumental': 'classical',
  'soundtrack': 'classical',
  'score': 'classical',
}

// Mood taxonomy - maps Last.fm tags to our standardized moods
const MOOD_MAP: Record<string, string> = {
  // Energetic
  'energetic': 'energetic',
  'party': 'energetic',
  'dance': 'energetic',
  'hype': 'energetic',
  'uplifting': 'energetic',
  'powerful': 'energetic',
  'intense': 'energetic',
  'aggressive': 'energetic',

  // Chill
  'chill': 'chill',
  'chillout': 'chill',
  'relaxing': 'chill',
  'mellow': 'chill',
  'calm': 'chill',
  'peaceful': 'chill',
  'ambient': 'chill',
  'lounge': 'chill',
  'easy listening': 'chill',

  // Melancholic
  'melancholic': 'melancholic',
  'melancholy': 'melancholic',
  'sad': 'melancholic',
  'depressing': 'melancholic',
  'emotional': 'melancholic',
  'moody': 'melancholic',
  'somber': 'melancholic',
  'nostalgic': 'melancholic',

  // Upbeat
  'upbeat': 'upbeat',
  'happy': 'upbeat',
  'fun': 'upbeat',
  'cheerful': 'upbeat',
  'joyful': 'upbeat',
  'feel good': 'upbeat',
  'feel-good': 'upbeat',
  'positive': 'upbeat',

  // Dark
  'dark': 'dark',
  'dark ambient': 'dark',
  'atmospheric': 'dark',
  'brooding': 'dark',
  'haunting': 'dark',
  'eerie': 'dark',

  // Romantic
  'romantic': 'romantic',
  'love': 'romantic',
  'sensual': 'romantic',
  'sexy': 'romantic',
  'passionate': 'romantic',
  'intimate': 'romantic',
}

export interface TrackMetadata {
  genres: string[]
  moods: string[]
  lastfmUrl?: string
}

// Lookup track metadata from Last.fm
export async function lookupTrackMetadata(artist: string, title: string): Promise<TrackMetadata | null> {
  const apiKey = getLastfmApiKey()
  if (!apiKey) {
    console.warn('LASTFM_API_KEY not configured')
    return null
  }

  try {
    // Clean up the title - remove common YouTube suffixes
    const cleanTitle = cleanTrackTitle(title)
    const cleanArtist = cleanArtistName(artist)

    // Try to get track info from Last.fm
    const url = new URL(LASTFM_BASE_URL)
    url.searchParams.set('method', 'track.getTopTags')
    url.searchParams.set('artist', cleanArtist)
    url.searchParams.set('track', cleanTitle)
    url.searchParams.set('api_key', apiKey)
    url.searchParams.set('format', 'json')

    const response = await fetch(url.toString())

    if (!response.ok) {
      console.warn(`Last.fm API error: ${response.status}`)
      return null
    }

    const data = await response.json()

    // Check for errors in response
    if (data.error) {
      console.warn(`Last.fm error for "${cleanArtist} - ${cleanTitle}": ${data.message}`)
      return null
    }

    // Extract tags
    const tags: string[] = data.toptags?.tag?.map((t: { name: string }) => t.name.toLowerCase()) || []

    if (tags.length === 0) {
      // Try artist tags as fallback
      return await lookupArtistTags(cleanArtist)
    }

    return {
      genres: mapToGenreTaxonomy(tags),
      moods: mapToMoodTaxonomy(tags),
      lastfmUrl: `https://www.last.fm/music/${encodeURIComponent(cleanArtist)}/_/${encodeURIComponent(cleanTitle)}`
    }

  } catch (error) {
    console.error('Last.fm lookup failed:', error)
    return null
  }
}

// Fallback: get artist-level tags when track tags are empty
async function lookupArtistTags(artist: string): Promise<TrackMetadata | null> {
  const apiKey = getLastfmApiKey()
  if (!apiKey) return null

  try {
    const url = new URL(LASTFM_BASE_URL)
    url.searchParams.set('method', 'artist.getTopTags')
    url.searchParams.set('artist', artist)
    url.searchParams.set('api_key', apiKey)
    url.searchParams.set('format', 'json')

    const response = await fetch(url.toString())
    if (!response.ok) return null

    const data = await response.json()
    if (data.error) return null

    const tags: string[] = data.toptags?.tag?.map((t: { name: string }) => t.name.toLowerCase()) || []

    return {
      genres: mapToGenreTaxonomy(tags),
      moods: mapToMoodTaxonomy(tags),
      lastfmUrl: `https://www.last.fm/music/${encodeURIComponent(artist)}`
    }

  } catch {
    return null
  }
}

// Map raw tags to our genre taxonomy
export function mapToGenreTaxonomy(tags: string[]): string[] {
  const genres = new Set<string>()

  for (const tag of tags) {
    const normalized = tag.toLowerCase().trim()
    if (GENRE_MAP[normalized]) {
      genres.add(GENRE_MAP[normalized])
    }
  }

  return Array.from(genres)
}

// Map raw tags to our mood taxonomy
export function mapToMoodTaxonomy(tags: string[]): string[] {
  const moods = new Set<string>()

  for (const tag of tags) {
    const normalized = tag.toLowerCase().trim()
    if (MOOD_MAP[normalized]) {
      moods.add(MOOD_MAP[normalized])
    }
  }

  return Array.from(moods)
}

// Clean track title - remove common YouTube suffixes
function cleanTrackTitle(title: string): string {
  return title
    .replace(/\(official\s*(music\s*)?video\)/gi, '')
    .replace(/\(official\s*audio\)/gi, '')
    .replace(/\(lyric\s*video\)/gi, '')
    .replace(/\(lyrics\)/gi, '')
    .replace(/\[official\s*(music\s*)?video\]/gi, '')
    .replace(/\[official\s*audio\]/gi, '')
    .replace(/\[lyrics\]/gi, '')
    .replace(/\[hd\]/gi, '')
    .replace(/\[hq\]/gi, '')
    .replace(/\(hd\)/gi, '')
    .replace(/\(hq\)/gi, '')
    .replace(/\s*\|\s*.*/gi, '') // Remove " | Artist" etc
    .replace(/\s*-\s*$/, '') // Remove trailing dash
    .trim()
}

// Clean artist name - handle VEVO channels, etc
function cleanArtistName(artist: string): string {
  return artist
    .replace(/VEVO$/i, '')
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/Official$/i, '')
    .trim()
}

// Get all available genres (for UI)
export function getGenreTaxonomy(): string[] {
  return ['rock', 'pop', 'electronic', 'hip-hop', 'r&b', 'jazz', 'metal', 'indie', 'folk', 'classical']
}

// Get all available moods (for UI)
export function getMoodTaxonomy(): string[] {
  return ['energetic', 'chill', 'melancholic', 'upbeat', 'dark', 'romantic']
}
