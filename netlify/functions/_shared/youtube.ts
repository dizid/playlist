// YouTube Data API integration for video search
import { config } from 'dotenv'

// Load .env file for local development
config()

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

// Get API key - try Netlify.env first (production), then process.env (local dev)
function getYouTubeApiKey(): string {
  return (typeof Netlify !== 'undefined' && Netlify.env?.get('YOUTUBE_API_KEY'))
    || process.env.YOUTUBE_API_KEY
    || ''
}

export interface YouTubeSearchResult {
  videoId: string
  title: string
  channelTitle: string
  thumbnail: string
}

/**
 * Search YouTube for a video matching artist and title
 * Returns the best matching video ID or null if not found
 */
export async function searchYouTubeVideo(
  artist: string,
  title: string
): Promise<YouTubeSearchResult | null> {
  const apiKey = getYouTubeApiKey()

  if (!apiKey) {
    console.warn('YOUTUBE_API_KEY not configured - skipping YouTube search')
    return null
  }

  try {
    // Build search query: "Artist - Title" or just "Title" if no artist
    const query = artist ? `${artist} - ${title}` : title

    const url = new URL(`${YOUTUBE_API_BASE}/search`)
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('q', query)
    url.searchParams.set('type', 'video')
    url.searchParams.set('videoCategoryId', '10') // Music category
    url.searchParams.set('maxResults', '1')
    url.searchParams.set('key', apiKey)

    const response = await fetch(url.toString())

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.warn(`YouTube API error: ${response.status}`, errorData)
      return null
    }

    const data = await response.json()
    const items = data.items || []

    if (items.length === 0) {
      console.log(`No YouTube results for: ${query}`)
      return null
    }

    const video = items[0]
    return {
      videoId: video.id.videoId,
      title: video.snippet.title,
      channelTitle: video.snippet.channelTitle,
      thumbnail: video.snippet.thumbnails?.default?.url || ''
    }
  } catch (error) {
    console.error('YouTube search failed:', error)
    return null
  }
}

/**
 * Check if a YouTube video ID is valid (exists and is playable)
 * Useful for validating existing IDs
 */
export async function validateYouTubeVideo(videoId: string): Promise<boolean> {
  const apiKey = getYouTubeApiKey()

  if (!apiKey) {
    // Without API key, assume valid (can't verify)
    return true
  }

  // Skip placeholder IDs (shazam imports)
  if (videoId.startsWith('shz')) {
    return false
  }

  try {
    const url = new URL(`${YOUTUBE_API_BASE}/videos`)
    url.searchParams.set('part', 'status')
    url.searchParams.set('id', videoId)
    url.searchParams.set('key', apiKey)

    const response = await fetch(url.toString())

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    const items = data.items || []

    // Video exists and has embeddable status
    return items.length > 0 && items[0].status?.embeddable !== false
  } catch {
    return false
  }
}
