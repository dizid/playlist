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
  it('is stable, case-insensitive and fits the 11-character youtube_id column', () => {
    expect(placeholderYouTubeId('OASIS', 'Wonderwall')).toBe(placeholderYouTubeId('oasis', 'wonderwall'))
    expect(placeholderYouTubeId('Oasis', 'Wonderwall')).toMatch(/^shz[0-9a-z]{8}$/)
    expect(placeholderYouTubeId('Some Very Long Artist Name', 'And A Very Long Title')).toHaveLength(11)
    expect(placeholderYouTubeId('', '')).toHaveLength(11)
  })

  it('gives different songs different ids where the old 31-bit hash collided', () => {
    // "az:x" and "b[:x" had the same old hash (97*31+122 = 98*31+91), so one
    // song's plays landed on the other
    expect(placeholderYouTubeId('az', 'x')).not.toBe(placeholderYouTubeId('b[', 'x'))
  })

  it('has no collisions across 50,000 distinct songs', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 50_000; i++) ids.add(placeholderYouTubeId(`Artist ${i % 997}`, `Track ${i}`))
    expect(ids.size).toBe(50_000)
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
