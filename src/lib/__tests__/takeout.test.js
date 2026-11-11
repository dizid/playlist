import { describe, it, expect } from 'vitest'
import { parseTakeoutHistory, decodeEntities, MAX_IMPORT_SONGS } from '../takeout'

// One entry the way Takeout writes watch-history.html
function entry({ header = 'YouTube', host = 'www.', id, title, channel, date, ad = false }) {
  const channelPart = channel === undefined
    ? ''
    : `<br><a href="https://www.youtube.com/channel/UC${id}">${channel}</a>`
  return `<div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp"><div class="mdl-grid">` +
    `<div class="header-cell mdl-cell mdl-cell--12-col"><p class="mdl-typography--title">${header}<br></p></div>` +
    `<div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">Watched&nbsp;` +
    `<a href="https://${host}youtube.com/watch?v=${id}">${title}</a>${channelPart}<br>${date}<br></div>` +
    `<div class="content-cell mdl-cell mdl-cell--12-col mdl-typography--caption"><b>Products:</b><br>&emsp;${header}<br>` +
    (ad ? '<b>Details:</b><br>&emsp;From Google Ads<br>' : '') +
    `</div></div></div>`
}

const NOW = Date.UTC(2026, 10, 12)

const FILE = '<html><body><div class="mdl-grid">' + [
  // Newest first, like Takeout
  entry({ header: 'YouTube Music', host: 'music.', id: 'AAAAAAAAAAA', title: 'Bohemian Rhapsody', channel: 'Queen - Topic', date: 'Nov 3, 2026, 9:15:00 PM GMT+07:00' }),
  entry({ header: 'YouTube', id: 'BBBBBBBBBBB', title: 'How interest rates work', channel: 'Money Explained', date: 'Nov 3, 2026, 8:00:00 PM GMT+07:00' }),
  entry({ header: 'YouTube Music', host: 'music.', id: 'AAAAAAAAAAA', title: 'Bohemian Rhapsody', channel: 'Queen - Topic', date: 'Nov 2, 2026, 9:15:00 PM GMT+07:00' }),
  entry({ header: 'YouTube', id: 'CCCCCCCCCCC', title: 'Rick Astley - Never Gonna Give You Up (Official Video)', channel: 'RickAstleyVEVO', date: 'Nov 1, 2026, 10:00:00 AM GMT+07:00' }),
  entry({ header: 'YouTube', id: 'DDDDDDDDDDD', title: 'https://www.youtube.com/watch?v=DDDDDDDDDDD', date: 'Oct 30, 2026, 10:00:00 AM GMT+07:00' }),
  entry({ header: 'YouTube', id: 'EEEEEEEEEEE', title: 'Buy our shoes', channel: 'Shoe Shop', date: 'Oct 29, 2026, 10:00:00 AM GMT+07:00', ad: true }),
  entry({ header: 'YouTube Music', host: 'music.', id: 'FFFFFFFFFFF', title: 'Rock &amp; Roll Ain&#39;t Noise Pollution', channel: 'AC/DC - Topic', date: '1 nov. 2026, 10:00:00 CET' }),
  entry({ header: 'YouTube Music', host: 'music.', id: 'AAAAAAAAAAA', title: 'Bohemian Rhapsody', channel: 'Queen - Topic', date: 'Oct 1, 2026, 9:15:00 PM GMT+07:00' })
].join('') + '</div></body></html>'

describe('parseTakeoutHistory', () => {
  it('reads real titles and artists instead of "Video <id>"', () => {
    const { songs } = parseTakeoutHistory(FILE, { now: NOW })
    const queen = songs.find(s => s.youtubeId === 'AAAAAAAAAAA')
    expect(queen).toMatchObject({ title: 'Bohemian Rhapsody', artist: 'Queen', channel: 'Queen - Topic', source: 'takeout' })

    const rick = songs.find(s => s.youtubeId === 'CCCCCCCCCCC')
    expect(rick).toMatchObject({ title: 'Never Gonna Give You Up (Official Video)', artist: 'Rick Astley', channel: 'RickAstleyVEVO' })

    expect(songs.some(s => /^Video /.test(s.title))).toBe(false)
  })

  it('counts plays and keeps the newest and oldest play date', () => {
    const { songs } = parseTakeoutHistory(FILE, { now: NOW })
    const queen = songs.find(s => s.youtubeId === 'AAAAAAAAAAA')
    expect(queen.playCount).toBe(3)
    expect(queen.lastPlayed).toBe('2026-11-03T14:15:00.000Z')
    expect(queen.firstPlayed).toBe('2026-10-01T14:15:00.000Z')
    // Most played first
    expect(songs[0].youtubeId).toBe('AAAAAAAAAAA')
  })

  it('decodes HTML entities and leaves dates it cannot read empty', () => {
    const { songs } = parseTakeoutHistory(FILE, { now: NOW })
    const acdc = songs.find(s => s.youtubeId === 'FFFFFFFFFFF')
    expect(acdc).toMatchObject({ title: "Rock & Roll Ain't Noise Pollution", artist: 'AC/DC', playCount: 1, lastPlayed: null })
  })

  it('imports only music by default, skips ads and removed videos', () => {
    const result = parseTakeoutHistory(FILE, { now: NOW })
    expect(result.songs.map(s => s.youtubeId).sort()).toEqual(['AAAAAAAAAAA', 'CCCCCCCCCCC', 'FFFFFFFFFFF'])
    expect(result.musicVideos).toBe(3)
    expect(result.otherVideos).toBe(1) // the interest-rate video
    expect(result.removedVideos).toBe(1)
  })

  it('imports regular videos too when "Only music" is off (still no ads)', () => {
    const { songs } = parseTakeoutHistory(FILE, { musicOnly: false, now: NOW })
    const ids = songs.map(s => s.youtubeId)
    expect(ids).toContain('BBBBBBBBBBB')
    expect(ids).not.toContain('EEEEEEEEEEE')
    expect(songs.find(s => s.youtubeId === 'BBBBBBBBBBB')).toMatchObject({ title: 'How interest rates work', artist: null, channel: 'Money Explained' })
  })

  it('caps one import at the most played songs', () => {
    const many = Array.from({ length: MAX_IMPORT_SONGS + 2 }, (_, i) => entry({
      header: 'YouTube Music', host: 'music.', id: `x${String(i).padStart(10, '0')}`,
      title: `Song ${i}`, channel: 'Band - Topic', date: 'Nov 1, 2026, 10:00:00 AM GMT+07:00'
    }))
    // Song 7 played twice: must survive the cap
    many.push(entry({ header: 'YouTube Music', host: 'music.', id: 'x0000000007', title: 'Song 7', channel: 'Band - Topic', date: 'Nov 2, 2026, 10:00:00 AM GMT+07:00' }))
    const result = parseTakeoutHistory(many.join(''), { now: NOW })
    expect(result.songs).toHaveLength(MAX_IMPORT_SONGS)
    expect(result.totalSongs).toBe(MAX_IMPORT_SONGS + 2)
    expect(result.songs[0]).toMatchObject({ youtubeId: 'x0000000007', playCount: 2 })
  })

  it('still finds videos when the file has no entry blocks', () => {
    const bare = '<a href="https://music.youtube.com/watch?v=GGGGGGGGGGG">Some Song</a>'
    const { songs } = parseTakeoutHistory(bare, { now: NOW })
    expect(songs).toEqual([expect.objectContaining({ youtubeId: 'GGGGGGGGGGG', title: 'Some Song', playCount: 1 })])
  })

  it('returns nothing for a file without videos', () => {
    expect(parseTakeoutHistory('<html>nothing here</html>', { now: NOW }).songs).toEqual([])
  })
})

describe('decodeEntities', () => {
  it('decodes named and numeric entities and leaves unknown ones', () => {
    expect(decodeEntities('A &amp; B &quot;C&quot; &#39;D&#39; &#x2764; &bogus;')).toBe('A & B "C" \'D\' ❤ &bogus;')
  })
})
