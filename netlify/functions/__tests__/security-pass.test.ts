// @vitest-environment node
// Handler tests for the T-0636 security pass (Nov 21 2026): the real function
// code runs; only the login check, the database and YouTube are stubbed.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- stubs ---------------------------------------------------------------

const state = vi.hoisted(() => ({
  session: null as null | { user: { id: string; email: string; emailVerified: boolean } },
  queries: [] as { text: string; values: unknown[] }[],
  // Each query returns the next queued result (default: [])
  results: [] as unknown[][]
}))

vi.mock('../_shared/auth', () => {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
  return {
    validateSession: async () => state.session,
    unauthorizedResponse: () => json({ error: 'Unauthorized' }, 401),
    jsonResponse: json,
    errorResponse: (message: string, status = 500) => json({ error: message }, status)
  }
})

vi.mock('../_shared/db', () => ({
  getDb: () => {
    const sql = (strings: TemplateStringsArray, ...values: unknown[]) => {
      state.queries.push({ text: strings.join('$'), values })
      return Promise.resolve(state.results.shift() ?? [])
    }
    sql.query = (text: string, values: unknown[]) => {
      state.queries.push({ text, values })
      return Promise.resolve(state.results.shift() ?? [])
    }
    sql.unsafe = (text: string) => text
    return sql
  }
}))

vi.mock('../_shared/youtube', () => ({
  searchYouTubeVideo: async () => null,
  youtubeQuotaExceeded: () => false
}))

import pushSubscribe from '../push-subscribe.mts'
import importApi from '../import.mts'
import importBackground from '../import-process-background.mts'
import songsApi from '../songs.mts'
import playlistsApi from '../playlists.mts'

const ctx = {} as never
const SONG_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'
const JOB_ID = '9b2d7c1e-1a2b-4c3d-8e9f-001122334455'

function request(method: string, path: string, body?: unknown) {
  return new Request(`https://tunecraft.music${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
  })
}

async function call(handler: (req: Request, ctx: never) => Promise<Response>, req: Request) {
  const res = await handler(req, ctx)
  return { status: res.status, body: await res.json().catch(() => null) }
}

const writes = () => state.queries.filter((q) => /INSERT|UPDATE|DELETE/.test(q.text))

beforeEach(() => {
  state.session = { user: { id: 'user-1', email: 'marc@example.com', emailVerified: true } }
  state.queries = []
  state.results = []
  vi.restoreAllMocks()
})

// ---- push subscriptions --------------------------------------------------

describe('POST /api/push/subscribe', () => {
  const keys = { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) }

  it('saves a real browser subscription as before', async () => {
    for (const endpoint of [
      'https://fcm.googleapis.com/fcm/send/abc:APA91b',
      'https://updates.push.services.mozilla.com/wpush/v2/gAAA',
      'https://web.push.apple.com/QGuQ',
      'https://wns2-par02p.notify.windows.com/w/?token=BQ'
    ]) {
      state.queries = []
      const res = await call(pushSubscribe, request('POST', '/api/push/subscribe', { endpoint, keys, userAgent: 'Mozilla/5.0' }))
      expect(res.status, endpoint).toBe(200)
      expect(writes()).toHaveLength(1)
      expect(writes()[0].values).toEqual(['user-1', endpoint, keys.p256dh, keys.auth, 'Mozilla/5.0'])
    }
  })

  it('refuses other addresses and stores nothing', async () => {
    for (const endpoint of [
      'https://169.254.169.254/latest/meta-data',
      'https://127.0.0.1:9001/2018-06-01/runtime/invocation/next',
      'https://example.com/hook',
      'http://fcm.googleapis.com/fcm/send/abc',
      'https://fcm.googleapis.com.evil.example/x'
    ]) {
      const res = await call(pushSubscribe, request('POST', '/api/push/subscribe', { endpoint, keys }))
      expect(res.status, endpoint).toBe(400)
      expect(res.body.error).toMatch(/push service is not supported/)
    }
    expect(state.queries).toHaveLength(0)
  })

  it('refuses oversized keys or user agent, and non-object bodies', async () => {
    const endpoint = 'https://fcm.googleapis.com/fcm/send/abc'
    const bad = [
      { endpoint, keys: { p256dh: 'B'.repeat(201), auth: 'a' } },
      { endpoint, keys: { p256dh: 'B', auth: { x: 1 } } },
      { endpoint, keys, userAgent: 'U'.repeat(501) }
    ]
    for (const body of bad) {
      expect((await call(pushSubscribe, request('POST', '/api/push/subscribe', body))).status).toBe(400)
    }
    expect((await call(pushSubscribe, request('POST', '/api/push/subscribe', 'null'))).status).toBe(400)
    expect((await call(pushSubscribe, request('POST', '/api/push/subscribe', '[1]'))).status).toBe(400)
    expect(state.queries).toHaveLength(0)
  })

  it('still needs a login', async () => {
    state.session = null
    expect((await call(pushSubscribe, request('POST', '/api/push/subscribe', {}))).status).toBe(401)
  })
})

// ---- import jobs ---------------------------------------------------------

describe('POST /api/import/batch', () => {
  const songs = [{ youtubeId: 'dQw4w9WgXcQ', title: 'Song', artist: 'Artist' }]

  function startJob(body: Record<string, unknown>) {
    // 1st query: no running job; 2nd: the INSERT returns the new job
    state.results = [[], [{ id: JOB_ID, status: 'pending', total_items: 1, created_at: 'now' }]]
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 202 })))
    return call(importApi, request('POST', '/api/import/batch', body))
  }
  // values: userId, type, total, notifyEmail, notifyPush, email, payload
  const insertedEmail = () => state.queries.find((q) => q.text.includes('INSERT INTO import_jobs'))?.values[5]

  it('starts all 4 real import types as before, email to the own verified address', async () => {
    for (const type of ['youtube_playlists', 'youtube_likes', 'shazam', 'takeout']) {
      state.queries = []
      const res = await startJob({ type, songs, notifyEmail: true, notifyPush: false, email: 'Marc@Example.com ' })
      expect(res.status, type).toBe(202)
      expect(insertedEmail()).toBe('marc@example.com')
    }
  })

  it('refuses an unknown type (it ends up in the email) and stores nothing', async () => {
    for (const type of ['<a href=//x.co>Win</a>', 'spotify', 42]) {
      const res = await startJob({ type, songs })
      expect(res.status).toBe(400)
    }
    expect(state.queries).toHaveLength(0)
  })

  it('never mails an unverified or different address', async () => {
    state.session = { user: { id: 'user-1', email: 'victim@example.com', emailVerified: false } }
    await startJob({ type: 'shazam', songs, email: 'victim@example.com' })
    expect(insertedEmail()).toBeNull()

    state.session = { user: { id: 'user-1', email: 'marc@example.com', emailVerified: true } }
    state.queries = []
    await startJob({ type: 'shazam', songs, email: 'someone-else@example.com' })
    expect(insertedEmail()).toBeNull()
  })
})

describe('import-process-background claim', () => {
  it('a job another request already claimed is not run again', async () => {
    // job row still says pending (read before the other request's update), claim finds nothing
    state.results = [[{ id: JOB_ID, user_id: 'user-1', status: 'pending', payload: [{ title: 'x' }] }], []]
    const res = await call(importBackground, request('POST', '/.netlify/functions/import-process-background', { jobId: JOB_ID }))
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/already processed or processing/)
    expect(state.queries.filter((q) => q.text.includes('INSERT INTO songs'))).toHaveLength(0)
    const claim = state.queries[1]
    expect(claim.text).toMatch(/status = 'pending'/)
    expect(claim.values).toEqual([JOB_ID, 'user-1'])
  })

  it('the claiming request runs the import', async () => {
    state.results = [
      [{ id: JOB_ID, user_id: 'user-1', status: 'pending', notify_email: false, notify_push: false, payload: [{ youtubeId: 'dQw4w9WgXcQ', title: 'Song' }] }],
      [{ id: JOB_ID }],       // claim
      [{ inserted: true }],   // song insert
      [{ id: JOB_ID }]        // progress update
    ]
    const res = await call(importBackground, request('POST', '/.netlify/functions/import-process-background', { jobId: JOB_ID }))
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'completed', insertedItems: 1 })
  })

  it('a malformed job id gets a 400 without touching the database', async () => {
    const res = await call(importBackground, request('POST', '/.netlify/functions/import-process-background', { jobId: "x' OR 1=1" }))
    expect(res.status).toBe(400)
    expect(state.queries).toHaveLength(0)
  })
})

// ---- songs ---------------------------------------------------------------

describe('POST /api/songs', () => {
  it('adds a normal song as before', async () => {
    state.results = [[{ id: SONG_ID }]]
    const res = await call(songsApi, request('POST', '/api/songs', {
      youtubeId: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artist: 'Rick Astley',
      channel: 'RickAstleyVEVO', duration: 213, thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg', source: 'youtube'
    }))
    expect(res.status).toBe(201)
    expect(writes()).toHaveLength(1)
  })

  it('refuses wrong types and oversized fields; nothing stored', async () => {
    const bad = [
      { title: 'x'.repeat(501) },
      { title: ['a'] },
      { title: 'ok', artist: 'x'.repeat(301) },
      { title: 'ok', thumbnail: 'x'.repeat(1001) },
      { title: 'ok', source: 'x'.repeat(21) },
      { title: 'ok', youtubeId: 'dQw4w9WgXcQ-too-long' },
      { title: 'ok', duration: '3:33' },
      { title: 'ok', channel: { a: 1 } }
    ]
    for (const body of bad) {
      const res = await call(songsApi, request('POST', '/api/songs', body))
      expect(res.status, JSON.stringify(body).slice(0, 60)).toBe(400)
    }
    expect(state.queries).toHaveLength(0)
  })
})

describe('PATCH /api/songs/:id tags', () => {
  it('saves what the tag editor sends', async () => {
    const res = await call(songsApi, request('PATCH', `/api/songs/${SONG_ID}`, { genres: ['rock', 'r&b'], moods: [] }))
    expect(res.status).toBe(200)
    expect(writes()).toHaveLength(1)
  })

  it('play count increment unchanged', async () => {
    const res = await call(songsApi, request('PATCH', `/api/songs/${SONG_ID}`, { incrementPlayCount: true }))
    expect(res.status).toBe(200)
    expect(writes()).toHaveLength(1)
  })

  it('refuses non-list or oversized tags', async () => {
    for (const body of [{ genres: 'rock' }, { moods: Array(21).fill('chill') }, { genres: ['x'.repeat(51)] }]) {
      expect((await call(songsApi, request('PATCH', `/api/songs/${SONG_ID}`, body))).status).toBe(400)
    }
    expect(state.queries).toHaveLength(0)
  })
})

// ---- playlists -----------------------------------------------------------

describe('playlists', () => {
  it('creates the 3 default smart playlists as before', async () => {
    for (const playlist of [
      { name: 'Fresh Loves', type: 'smart', rules: { sortBy: 'created_at', sortOrder: 'desc', minPlayCount: 2, limit: 50 } },
      { name: 'Heavy Rotation', type: 'smart', rules: { sortBy: 'last_played', sortOrder: 'desc', minPlayCount: 3, limit: 50 } },
      { name: 'Top 50', type: 'smart', rules: { sortBy: 'play_count', sortOrder: 'desc', limit: 50 } }
    ]) {
      state.results = [[{ id: SONG_ID, ...playlist }]]
      expect((await call(playlistsApi, request('POST', '/api/playlists', playlist))).status).toBe(201)
    }
  })

  it('creates a manual playlist with song ids', async () => {
    state.results = [[{ id: SONG_ID }]]
    const res = await call(playlistsApi, request('POST', '/api/playlists', { name: 'Mine', type: 'manual', songIds: [SONG_ID] }))
    expect(res.status).toBe(201)
  })

  it('refuses bad names, types, rules and song ids; nothing stored', async () => {
    const bad = [
      { name: 'x'.repeat(201) },
      { name: { a: 1 } },
      { name: 'ok', type: 'evil' },
      { name: 'ok', rules: 'sortBy=x' },
      { name: 'ok', rules: { genres: Array(1000).fill('electronic') } },
      { name: 'ok', songIds: ['not-a-uuid'] }
    ]
    for (const body of bad) {
      expect((await call(playlistsApi, request('POST', '/api/playlists', body))).status).toBe(400)
    }
    for (const body of [{ name: '' }, { name: 'x'.repeat(201) }, { songIds: 'abc' }, { rules: [1] }]) {
      expect((await call(playlistsApi, request('PATCH', `/api/playlists/${SONG_ID}`, body))).status).toBe(400)
    }
    expect(state.queries).toHaveLength(0)
  })

  it('a rename still works', async () => {
    const res = await call(playlistsApi, request('PATCH', `/api/playlists/${SONG_ID}`, { name: 'Renamed' }))
    expect(res.status).toBe(200)
    expect(writes()).toHaveLength(1)
  })
})
