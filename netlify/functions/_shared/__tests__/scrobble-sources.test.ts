import { describe, it, expect } from 'vitest'
import {
  normalizeLastfmTrack,
  lastfmTrackList,
  normalizeListenBrainzListen,
  placeholderYouTubeId,
  isProvider
} from '../scrobble-sources'

describe('normalizeLastfmTrack', () => {
  const track = {
    name: ' My Hero ',
    artist: { name: 'Foo Fighters' },
    album: { '#text': 'The Colour and the Shape' },
    image: [
      { size: 'small', '#text': 'https://img/34s/abc.png' },
      { size: 'extralarge', '#text': 'https://img/300x300/abc.png' }
    ],
    date: { uts: '1793654486' }
  }

  it('maps an extended getRecentTracks item', () => {
    expect(normalizeLastfmTrack(track)).toEqual({
      artist: 'Foo Fighters',
      title: 'My Hero',
      album: 'The Colour and the Shape',
      playedAt: 1793654486,
      thumbnail: 'https://img/300x300/abc.png'
    })
  })

  it('reads the non-extended artist format', () => {
    const play = normalizeLastfmTrack({ ...track, artist: { '#text': 'Oasis' } })
    expect(play?.artist).toBe('Oasis')
  })

  it('skips the now-playing entry, which has no timestamp yet', () => {
    expect(normalizeLastfmTrack({ ...track, date: undefined, '@attr': { nowplaying: 'true' } })).toBeNull()
  })

  it('skips plays without artist or title', () => {
    expect(normalizeLastfmTrack({ ...track, name: '  ' })).toBeNull()
    expect(normalizeLastfmTrack({ ...track, artist: {} })).toBeNull()
  })

  it('ignores the Last.fm placeholder star image', () => {
    const play = normalizeLastfmTrack({
      ...track,
      image: [{ size: 'extralarge', '#text': 'https://img/300x300/2a96cbd8b46e442fc41c2b86b821562f.png' }]
    })
    expect(play?.thumbnail).toBeNull()
  })
})

describe('lastfmTrackList', () => {
  it('wraps the single-object response Last.fm sends for exactly one track', () => {
    expect(lastfmTrackList({ name: 'Only one' })).toEqual([{ name: 'Only one' }])
    expect(lastfmTrackList(undefined)).toEqual([])
    expect(lastfmTrackList([{ name: 'a' }, { name: 'b' }])).toHaveLength(2)
  })
})

describe('normalizeListenBrainzListen', () => {
  it('maps a listen and builds a Cover Art Archive thumbnail', () => {
    const play = normalizeListenBrainzListen({
      listened_at: 1771414109,
      track_metadata: {
        artist_name: 'Röyksopp',
        track_name: 'Some Resolve',
        release_name: 'Profound Mysteries II',
        mbid_mapping: { caa_id: 123, caa_release_mbid: 'rel-mbid' }
      }
    })
    expect(play).toEqual({
      artist: 'Röyksopp',
      title: 'Some Resolve',
      album: 'Profound Mysteries II',
      playedAt: 1771414109,
      thumbnail: 'https://coverartarchive.org/release/rel-mbid/123-250.jpg'
    })
  })

  it('skips listens without a timestamp or names', () => {
    expect(normalizeListenBrainzListen({ track_metadata: { artist_name: 'a', track_name: 'b' } })).toBeNull()
    expect(normalizeListenBrainzListen({ listened_at: 1, track_metadata: { artist_name: 'a' } })).toBeNull()
  })
})

describe('placeholderYouTubeId', () => {
  // Same algorithm as the inline copies in songs.mts and import-process-background.mts,
  // so Shazam imports and synced plays of one song share a row
  function inlineVersion(artist: string, title: string) {
    const hashInput = `${artist}:${title}`.toLowerCase()
    const hashCode = Array.from(hashInput).reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0) | 0
    }, 0)
    return `shz${Math.abs(hashCode).toString(36).slice(0, 8)}`
  }

  it('matches the existing Shazam placeholder ids', () => {
    for (const [artist, title] of [['Foo Fighters', 'My Hero'], ['Röyksopp', 'Some Resolve'], ['A', 'B']]) {
      expect(placeholderYouTubeId(artist, title)).toBe(inlineVersion(artist, title))
    }
  })

  it('is case-insensitive and fits the 11-character youtube_id column', () => {
    expect(placeholderYouTubeId('OASIS', 'Wonderwall')).toBe(placeholderYouTubeId('oasis', 'wonderwall'))
    expect(placeholderYouTubeId('Some Very Long Artist Name', 'And A Very Long Title').length).toBeLessThanOrEqual(11)
  })
})

describe('isProvider', () => {
  it('accepts only supported services', () => {
    expect(isProvider('lastfm')).toBe(true)
    expect(isProvider('listenbrainz')).toBe(true)
    expect(isProvider('spotify')).toBe(false)
    expect(isProvider(undefined)).toBe(false)
  })
})
