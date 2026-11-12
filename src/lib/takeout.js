// Parser for Google Takeout's watch-history.html (YouTube and YouTube Music).
//
// Each entry in the file is one "outer-cell" block:
//   <p class="mdl-typography--title">YouTube Music<br></p>            (product header)
//   Watched&nbsp;<a href="https://music.youtube.com/watch?v=ID">Song title</a><br>
//   <a href="https://www.youtube.com/channel/UC...">Artist - Topic</a><br>
//   Nov 1, 2026, 10:00:00 AM GMT+07:00<br>
//
// The old import only kept the video IDs and saved every song as "Video <ID>"
// with no artist. This reads the real title, the channel (artist), how often
// each song was played and when it was last played.
//
// Pure string work (no DOM tree for the whole file), so a file of tens of MB
// stays light on a phone.

/** Most songs one import job accepts (same cap as the import API). */
export const MAX_IMPORT_SONGS = 5000

const VIDEO_LINK = /<a href="https?:\/\/(www\.|m\.|music\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})[^"]*">([^<]*)<\/a>/
const CHANNEL_LINK = /^\s*<br>\s*<a href="https?:\/\/(?:www\.)?youtube\.com\/(?:channel\/|@|c\/|user\/)[^"]*">([^<]*)<\/a>/
const HEADER = /mdl-typography--title">([^<]*)</
const DATE_LINE = /^\s*<br>\s*([^<]{6,60})<br>/
const EARLIEST_PLAY = Date.UTC(2005, 0, 1) // YouTube's first year

// Fallback when the file has no outer-cell blocks (format changed): every video link
const ANY_VIDEO_LINK = new RegExp(VIDEO_LINK.source, 'g')

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

/** Turn HTML entities in a title or channel name back into text (&amp; -> &, &#39; -> '). */
export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] === '#') {
      const num = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(num) && num > 0 && num <= 0x10ffff ? String.fromCodePoint(num) : match
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match
  })
}

// Takeout writes the date in the account's language and time zone. Browsers only
// read English months and the US zone names, so "Nov 1, 2026, 10:00:00 AM CET",
// "... ICT" (Thailand) or "1 nov. 2026, 10:00:00 CET" lost their date.
// Offsets are standard/summer time as named; for the play date that is plenty.
const ZONE_OFFSETS = {
  UTC: 0, GMT: 0, WET: 0, WEST: 60, BST: 60, IST: 330, CET: 60, CEST: 120, EET: 120, EEST: 180,
  MSK: 180, SAST: 120, ICT: 420, WIB: 420, SGT: 480, HKT: 480, PHT: 480, PHST: 480, AWST: 480,
  JST: 540, KST: 540, ACST: 570, AEST: 600, AEDT: 660, NZST: 720, NZDT: 780,
  BRT: -180, ART: -180, AST: -240, EST: -300, EDT: -240, CST: -360, CDT: -300,
  MST: -420, MDT: -360, PST: -480, PDT: -420, AKST: -540, AKDT: -480, HST: -600,
  // German names
  MEZ: 60, MESZ: 120, OEZ: 120, OESZ: 180, WEZ: 0, WESZ: 60
}

// Month names and short forms (English, Dutch, German, French, Spanish, Portuguese,
// Italian), lowercase without dots; the longest matching start of the word wins.
const MONTH_NAMES = [
  ['jan', 'janv', 'ene', 'gen'],
  ['feb', 'fév', 'fev', 'févr', 'fevr'],
  ['mar', 'mrt', 'mär', 'maa', 'mars', 'març'],
  ['apr', 'avr', 'abr'],
  ['may', 'mei', 'mai', 'mag'],
  ['jun', 'juin', 'giu'],
  ['jul', 'juil', 'lug'],
  ['aug', 'août', 'aout', 'ago'],
  ['sep', 'sept', 'set'],
  ['oct', 'okt', 'out', 'ott'],
  ['nov'],
  ['dec', 'dez', 'déc', 'dic']
]

function monthIndex(word) {
  const w = word.toLowerCase().replace(/\./g, '')
  let best = -1
  let bestLength = 0
  MONTH_NAMES.forEach((names, index) => {
    for (const name of names) {
      if (w.startsWith(name) && name.length > bestLength) { best = index; bestLength = name.length }
    }
  })
  return best
}

/** Minutes east of UTC for "GMT+07:00", "UTC-5", "CET"...; null when unknown. */
function zoneOffsetMinutes(zone) {
  const numeric = /^(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?$/i.exec(zone)
  if (numeric) return (numeric[1] === '-' ? -1 : 1) * (Number(numeric[2]) * 60 + Number(numeric[3] || 0))
  const named = ZONE_OFFSETS[zone.toUpperCase()]
  return named === undefined ? null : named
}

/** "Nov 1, 2026, 10:00:00 AM CET" or "1 nov. 2026, 10:00:00 CET" -> epoch ms; NaN if unreadable. */
function parseLocalizedDate(text) {
  const zoneMatch = /\s((?:GMT|UTC)[+-]\d{1,2}(?::?\d{2})?|[A-Z]{2,5})$/.exec(text)
  const offset = zoneMatch ? zoneOffsetMinutes(zoneMatch[1]) : 0
  if (offset === null) return NaN
  const body = zoneMatch ? text.slice(0, zoneMatch.index) : text
  const time = /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp]\.?\s?[Mm]\.?)?/.exec(body)
  // Month first ("Nov 1, 2026") or day first ("1 nov. 2026", "1. Nov. 2026", "1 de nov. de 2026")
  const monthFirst = /^([^\d\s,]+)\.?\s+(\d{1,2}),?\s+(\d{4})/.exec(body)
  const dayFirst = /^(\d{1,2})\.?\s+(?:de\s+)?([^\d\s,]+)\.?\s+(?:de\s+)?(\d{4})/.exec(body)
  const parts = monthFirst
    ? { month: monthIndex(monthFirst[1]), day: Number(monthFirst[2]), year: Number(monthFirst[3]) }
    : dayFirst
      ? { month: monthIndex(dayFirst[2]), day: Number(dayFirst[1]), year: Number(dayFirst[3]) }
      : null
  if (!parts || parts.month < 0 || !time) return NaN
  let hour = Number(time[1])
  const meridiem = (time[4] || '').toLowerCase().replace(/[.\s]/g, '')
  if (meridiem === 'pm' && hour < 12) hour += 12
  if (meridiem === 'am' && hour === 12) hour = 0
  return Date.UTC(parts.year, parts.month, parts.day, hour, Number(time[2]), Number(time[3] || 0)) - offset * 60000
}

/** "Nov 1, 2026, 10:00:00 AM GMT+07:00" -> ISO string; null when it can't be read. */
function parsePlayDate(text, now) {
  const cleaned = text.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim()
  // The browser reads English dates with GMT/UTC offsets or US zone names itself
  const browserReadable = /(?:GMT|UTC)[+-]\d|\s(?:GMT|UTC|EST|EDT|CST|CDT|MST|MDT|PST|PDT)$/.test(cleaned)
  let time = browserReadable ? Date.parse(cleaned) : NaN
  if (!Number.isFinite(time)) time = parseLocalizedDate(cleaned)
  if (!Number.isFinite(time) || time < EARLIEST_PLAY || time > now + 86400000) return null
  return new Date(time).toISOString()
}

/** Music if it was played in YouTube Music, or comes from an auto-generated artist ("- Topic") or VEVO channel. */
function isMusicEntry({ header, host, channel }) {
  return header === 'YouTube Music' ||
    host === 'music.' ||
    / - Topic$/.test(channel) ||
    /VEVO$/i.test(channel)
}

/**
 * Split into artist and song title the same way the YouTube playlist import does,
 * but prefer the auto-generated "Artist - Topic" channel when there is one.
 */
function splitArtistTitle(title, channel) {
  if (/ - Topic$/.test(channel)) {
    return { artist: channel.replace(/ - Topic$/, '').trim() || null, title }
  }
  if (title.includes(' - ')) {
    const parts = title.split(' - ')
    const artist = parts[0].trim()
    const songTitle = parts.slice(1).join(' - ').trim()
    if (artist && songTitle) return { artist, title: songTitle }
  }
  return { artist: null, title }
}

/** Read one entry block; null when it holds no playable video. */
function readEntry(block, now) {
  const link = VIDEO_LINK.exec(block)
  if (!link) return null
  const [, host = '', youtubeId, rawTitle] = link
  const fullTitle = decodeEntities(rawTitle).trim()

  // After the video link: "<br><a ...channel...>Name</a>" (missing for some
  // videos), then "<br>date<br>"
  const afterLink = block.slice(link.index + link[0].length)
  const channelMatch = CHANNEL_LINK.exec(afterLink)
  const channel = channelMatch ? decodeEntities(channelMatch[1]).trim() : ''
  const dateMatch = DATE_LINE.exec(channelMatch ? afterLink.slice(channelMatch[0].length) : afterLink)
  const headerMatch = HEADER.exec(block)

  return {
    youtubeId,
    host,
    header: headerMatch ? decodeEntities(headerMatch[1]).trim() : '',
    fullTitle,
    channel,
    playedAt: dateMatch ? parsePlayDate(decodeEntities(dateMatch[1]), now) : null
  }
}

/**
 * Parse watch-history.html.
 *
 * @param {string} html  the whole file
 * @param {object} [options]
 * @param {boolean} [options.musicOnly=true]  skip regular videos (news, podcasts, vlogs)
 * @param {number} [options.now=Date.now()]   for tests
 * @returns {{ songs: object[], musicVideos: number, otherVideos: number, removedVideos: number, totalSongs: number }}
 *   songs: ready for the import API (youtubeId, title, artist, channel, playCount,
 *   lastPlayed, firstPlayed, source), most played first, at most MAX_IMPORT_SONGS.
 *   totalSongs: how many songs there were before that cap.
 */
export function parseTakeoutHistory(html, { musicOnly = true, now = Date.now() } = {}) {
  let blocks = html.split(/<div class="outer-cell/).slice(1)
  if (blocks.length === 0) blocks = [...html.matchAll(ANY_VIDEO_LINK)].map(m => m[0])

  const byId = new Map()
  let removedVideos = 0

  for (const block of blocks) {
    // Ads you watched are in the history too ("From Google Ads"): never songs
    if (block.includes('From Google Ads')) continue
    const entry = readEntry(block, now)
    if (!entry) continue

    // A removed or private video has its URL as the "title": nothing to show or play
    if (!entry.fullTitle || /^https?:\/\//.test(entry.fullTitle)) {
      removedVideos++
      continue
    }

    let song = byId.get(entry.youtubeId)
    if (!song) {
      song = { ...entry, music: false, playCount: 0, lastPlayed: null, firstPlayed: null }
      byId.set(entry.youtubeId, song)
    }
    song.playCount++
    if (isMusicEntry(entry)) song.music = true
    if (!song.channel && entry.channel) song.channel = entry.channel
    if (entry.playedAt) {
      if (!song.lastPlayed || entry.playedAt > song.lastPlayed) song.lastPlayed = entry.playedAt
      if (!song.firstPlayed || entry.playedAt < song.firstPlayed) song.firstPlayed = entry.playedAt
    }
  }

  const all = [...byId.values()]
  const musicVideos = all.filter(s => s.music).length
  const picked = (musicOnly ? all.filter(s => s.music) : all)
    .sort((a, b) => b.playCount - a.playCount)

  const songs = picked.slice(0, MAX_IMPORT_SONGS).map(s => {
    const { artist, title } = splitArtistTitle(s.fullTitle, s.channel)
    return {
      youtubeId: s.youtubeId,
      title,
      artist,
      channel: s.channel || null,
      playCount: s.playCount,
      lastPlayed: s.lastPlayed,
      firstPlayed: s.firstPlayed,
      source: 'takeout'
    }
  })

  return {
    songs,
    musicVideos,
    otherVideos: all.length - musicVideos,
    removedVideos,
    totalSongs: picked.length
  }
}
