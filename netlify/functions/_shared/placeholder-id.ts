import { createHash } from 'node:crypto'

// Stand-in youtube_id for a song that has no YouTube video yet ("shz" + 8
// characters, fits the VARCHAR(11) column). The one copy used everywhere
// (Shazam/CSV import, adding a song, Last.fm/ListenBrainz sync), so the same
// song from any source lands on the same row.
//
// Built from 40 bits of a SHA-1 of "artist:title" (lowercased). It used to be
// a 31-bit string hash, where two different songs could get the same ID
// (about 2% at 10,000 songs, 45% at 50,000), and then one song's plays were
// counted on the other and the second song never appeared. Changed Nov 12 2026
// while no stand-in IDs existed in the database, so no old IDs needed moving.
export function placeholderYouTubeId(artist: string, title: string): string {
  const digest = createHash('sha1').update(`${artist}:${title}`.toLowerCase()).digest('hex')
  // 40 bits = 10 hex digits: an exact integer in JS, at most 8 base-36 digits
  const value = parseInt(digest.slice(0, 10), 16)
  return `shz${value.toString(36).padStart(8, '0')}`
}
