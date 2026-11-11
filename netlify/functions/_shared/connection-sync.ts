// Sync engine for connected scrobble services (Last.fm, ListenBrainz).
//
// Each run works until a deadline, then stops; it is safe to stop at any point because both
// cursors are saved after every page and play inserts are idempotent (unique index).
//   1. Catch up: walk forward from the newest imported play to now.
//   2. Backfill: walk backward from the oldest imported play until the history runs out.
// A run is short (one Netlify function call), so a big history is imported over several runs:
// the Import page keeps calling "sync" while it is open, and the hourly job continues the rest.

import type { getDb } from './db'
import { getScrobbleClient, placeholderYouTubeId, ProviderError, type Play, type Provider } from './scrobble-sources'

type Sql = ReturnType<typeof getDb>

export interface ConnectionRow {
  id: string
  user_id: string
  provider: Provider
  external_username: string
  status: string
  newest_play_ts: string | number | null   // BIGINT comes back as string
  oldest_play_ts: string | number | null
  backfill_done: boolean
  plays_imported: number
  provider_total_plays: number | null
  last_synced_at: string | null
  last_error: string | null
}

export interface SyncOutcome {
  busy: boolean            // another run holds the lock; nothing was done
  importedPlays: number    // new plays saved in this run
  complete: boolean        // caught up AND full history imported
  connection: ConnectionRow | null
}

// A run that died without releasing its lock is considered stale after this long
const LOCK_STALE_AFTER = '2 minutes'

const GENERIC_SYNC_ERROR = 'Sync failed. It will retry automatically.'

const toTs = (value: string | number | null): number | null => value === null ? null : Number(value)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Columns returned to the API (no internal lock field)
export const CONNECTION_COLUMNS = `id, user_id, provider, external_username, status, newest_play_ts, oldest_play_ts,
  backfill_done, plays_imported, provider_total_plays, last_synced_at, last_error`

/**
 * Save one page of plays: resolve each play to a song row (existing match by artist + title,
 * otherwise a placeholder song), insert the plays, and bump play_count / first / last played.
 * Returns how many plays were new.
 */
export async function savePlays(sql: Sql, userId: string, provider: Provider, plays: Play[]): Promise<number> {
  if (plays.length === 0) return 0

  // Distinct songs on this page, keyed case-insensitively; first occurrence wins for display
  const songIndexByKey = new Map<string, number>()
  const songs: Array<{ artist: string, title: string, placeholderId: string, thumbnail: string | null }> = []
  const playSongIndex: number[] = []

  for (const play of plays) {
    const key = `${play.artist}\u0000${play.title}`.toLowerCase()
    let index = songIndexByKey.get(key)
    if (index === undefined) {
      index = songs.length
      songIndexByKey.set(key, index)
      songs.push({
        artist: play.artist,
        title: play.title,
        placeholderId: placeholderYouTubeId(play.artist, play.title),
        thumbnail: play.thumbnail
      })
    }
    playSongIndex.push(index)
  }

  // 1. Resolve every distinct song to a song id in one statement:
  //    prefer an existing song with the same artist + title (real YouTube link first),
  //    else create a placeholder song (youtube_status 'pending' = the Enrich step can look it up later).
  const resolved = await sql`
    WITH input AS (
      SELECT * FROM unnest(
        ${songs.map(s => s.artist)}::text[],
        ${songs.map(s => s.title)}::text[],
        ${songs.map(s => s.placeholderId)}::text[],
        ${songs.map(s => s.thumbnail)}::text[]
      ) WITH ORDINALITY AS k(artist, title, placeholder_id, thumbnail, idx)
    ),
    matched AS (
      SELECT DISTINCT ON (k.idx) k.idx, s.id
      FROM input k
      JOIN songs s
        ON s.user_id = ${userId}
       AND lower(s.artist) = lower(k.artist)
       AND lower(s.title) = lower(k.title)
      ORDER BY k.idx, (s.youtube_id LIKE 'shz%'), s.created_at
    ),
    created AS (
      INSERT INTO songs (user_id, youtube_id, youtube_status, title, artist, thumbnail, source)
      SELECT ${userId}, k.placeholder_id, 'pending', k.title, k.artist, k.thumbnail, ${provider}
      FROM input k
      WHERE NOT EXISTS (SELECT 1 FROM matched m WHERE m.idx = k.idx)
      ON CONFLICT (user_id, youtube_id) DO NOTHING
      RETURNING id, youtube_id
    )
    SELECT k.idx::int AS idx, COALESCE(m.id, c.id, e.id) AS song_id
    FROM input k
    LEFT JOIN matched m ON m.idx = k.idx
    LEFT JOIN created c ON c.youtube_id = k.placeholder_id
    LEFT JOIN songs e ON e.user_id = ${userId} AND e.youtube_id = k.placeholder_id
  `

  // ORDINALITY is 1-based
  const songIdByIndex = new Map<number, string>()
  for (const row of resolved) {
    if (row.song_id) songIdByIndex.set(Number(row.idx) - 1, row.song_id as string)
  }

  // Rare race: a parallel sync (other provider) committed the same placeholder after our statement
  // started, so neither "created" nor the snapshot join saw it. Look those up once more.
  const unresolved = songs.map((song, index) => ({ song, index })).filter(({ index }) => !songIdByIndex.has(index))
  if (unresolved.length > 0) {
    const late = await sql`
      SELECT id, youtube_id FROM songs
      WHERE user_id = ${userId} AND youtube_id = ANY(${unresolved.map(u => u.song.placeholderId)}::text[])
    `
    const idByPlaceholder = new Map(late.map(row => [row.youtube_id as string, row.id as string]))
    for (const { song, index } of unresolved) {
      const songId = idByPlaceholder.get(song.placeholderId)
      if (songId) songIdByIndex.set(index, songId)
    }
  }

  const playSongIds: string[] = []
  const playTimestamps: number[] = []
  plays.forEach((play, i) => {
    const songId = songIdByIndex.get(playSongIndex[i])
    if (!songId) return
    playSongIds.push(songId)
    playTimestamps.push(play.playedAt)
  })
  if (playSongIds.length === 0) return 0

  // 2. Insert plays (duplicates skipped by the unique index) and bump song stats for new plays only
  const result = await sql`
    WITH new_plays AS (
      INSERT INTO play_history (user_id, song_id, played_at, completed, source)
      SELECT ${userId}, p.song_id, to_timestamp(p.ts), TRUE, ${provider}
      FROM unnest(${playSongIds}::uuid[], ${playTimestamps}::bigint[]) AS p(song_id, ts)
      ON CONFLICT (user_id, song_id, played_at) DO NOTHING
      RETURNING song_id, played_at
    ),
    per_song AS (
      SELECT song_id, COUNT(*)::int AS plays, MIN(played_at) AS first_at, MAX(played_at) AS last_at
      FROM new_plays
      GROUP BY song_id
    ),
    bumped AS (
      UPDATE songs s
      SET play_count = COALESCE(s.play_count, 0) + per_song.plays,
          first_played = LEAST(s.first_played, per_song.first_at),
          last_played = GREATEST(s.last_played, per_song.last_at)
      FROM per_song
      WHERE s.id = per_song.song_id AND s.user_id = ${userId}
      RETURNING s.id
    )
    SELECT COALESCE(SUM(plays), 0)::int AS inserted FROM per_song
  `
  return Number(result[0]?.inserted ?? 0)
}

/**
 * Run one sync pass for a connection until `deadline` (ms timestamp).
 * Never throws for provider problems: they are stored on the connection row.
 */
/** The connection was removed (disconnect or "Delete all data") while a run was going. */
class ConnectionGoneError extends Error {}

export async function runConnectionSync(sql: Sql, connectionId: string, userId: string, deadline: number): Promise<SyncOutcome> {
  // Take the run lock (one run per connection at a time)
  const claimed = await sql`
    UPDATE connections
    SET status = 'syncing', sync_started_at = NOW(), updated_at = NOW()
    WHERE id = ${connectionId}::uuid AND user_id = ${userId}
      AND (sync_started_at IS NULL OR sync_started_at < NOW() - ${LOCK_STALE_AFTER}::interval)
    RETURNING *
  `
  if (claimed.length === 0) {
    return { busy: true, importedPlays: 0, complete: false, connection: null }
  }

  const connection = claimed[0] as ConnectionRow
  const client = getScrobbleClient(connection.provider)
  const username = connection.external_username
  let newestTs = toTs(connection.newest_play_ts)
  let oldestTs = toTs(connection.oldest_play_ts)
  let backfillDone = connection.backfill_done
  let importedPlays = 0
  let caughtUp = false
  let requestCount = 0

  const timeLeft = () => Date.now() < deadline
  const pause = async () => { if (requestCount++ > 0) await sleep(client.requestDelayMs) }

  // Save one page, but only while the connection still exists: after a disconnect or
  // "Delete all data" a run that is still going must not put songs and plays back.
  const savePage = async (plays: Play[]) => {
    const exists = await sql`SELECT 1 FROM connections WHERE id = ${connectionId}::uuid AND user_id = ${userId}`
    if (exists.length === 0) throw new ConnectionGoneError()
    return savePlays(sql, userId, connection.provider, plays)
  }

  // Persist cursors after every page so a timeout never loses progress
  const saveProgress = async (inserted: number) => {
    importedPlays += inserted
    await sql`
      UPDATE connections
      SET newest_play_ts = ${newestTs}, oldest_play_ts = ${oldestTs}, backfill_done = ${backfillDone},
          plays_imported = plays_imported + ${inserted}, updated_at = NOW()
      WHERE id = ${connectionId}::uuid
    `
  }

  try {
    // Refresh the provider's total for the progress bar
    await pause()
    const profile = await client.getProfile(username)
    if (profile.totalPlays !== null) {
      await sql`UPDATE connections SET provider_total_plays = ${profile.totalPlays} WHERE id = ${connectionId}::uuid`
    }

    // First run: import the newest page to anchor both cursors
    if (newestTs === null) {
      await pause()
      const { plays, hasMore } = await client.getPlaysAtOrBefore(username, null)
      const inserted = await savePage(plays)
      if (plays.length > 0) {
        newestTs = Math.max(...plays.map(p => p.playedAt))
        oldestTs = Math.min(...plays.map(p => p.playedAt))
      }
      backfillDone = plays.length === 0 || !hasMore
      caughtUp = true
      await saveProgress(inserted)
    }

    // 1. Catch up on plays newer than the newest imported one
    while (!caughtUp && timeLeft()) {
      await pause()
      const previousNewest = newestTs!
      const { plays, hasMore } = await client.getPlaysAtOrAfter(username, previousNewest)
      const inserted = await savePage(plays)
      const pageMax = plays.length ? Math.max(...plays.map(p => p.playedAt)) : previousNewest
      if (pageMax > previousNewest) {
        newestTs = pageMax
      } else if (hasMore) {
        newestTs = previousNewest + 1 // a whole page on one second: step past it, never loop forever
      }
      if (!hasMore) caughtUp = true
      await saveProgress(inserted)
    }

    // 2. Backfill older history
    while (caughtUp && !backfillDone && timeLeft()) {
      await pause()
      const previousOldest = oldestTs!
      const { plays, hasMore } = await client.getPlaysAtOrBefore(username, previousOldest)
      const inserted = await savePage(plays)
      const pageMin = plays.length ? Math.min(...plays.map(p => p.playedAt)) : previousOldest
      if (pageMin < previousOldest) {
        oldestTs = pageMin
      } else if (hasMore) {
        oldestTs = previousOldest - 1 // a whole page on one second: step past it
      }
      if (!hasMore) backfillDone = true
      await saveProgress(inserted)
    }

    const finished = await sql`
      UPDATE connections
      SET status = 'ok', last_error = NULL, last_synced_at = NOW(), sync_started_at = NULL, updated_at = NOW()
      WHERE id = ${connectionId}::uuid
      RETURNING ${sql.unsafe(CONNECTION_COLUMNS)}
    `
    return {
      busy: false,
      importedPlays,
      complete: caughtUp && backfillDone,
      connection: finished[0] as ConnectionRow
    }
  } catch (error) {
    // Removed mid-run: nothing left to update, just stop
    if (error instanceof ConnectionGoneError) {
      return { busy: false, importedPlays, complete: false, connection: null }
    }
    // Problems the user can fix (unknown user, private profile) block further syncs until they act;
    // anything else (timeouts, rate limits, outages) keeps the connection active for the next run
    const userFacing = error instanceof ProviderError && error.userFacing
    if (!userFacing) console.error(`[Sync] ${connection.provider} sync failed for connection ${connectionId}:`, error)

    const failed = await sql`
      UPDATE connections
      SET status = ${userFacing ? 'error' : 'ok'},
          last_error = ${userFacing ? (error as Error).message : GENERIC_SYNC_ERROR},
          sync_started_at = NULL,
          updated_at = NOW()
      WHERE id = ${connectionId}::uuid
      RETURNING ${sql.unsafe(CONNECTION_COLUMNS)}
    `
    return { busy: false, importedPlays, complete: false, connection: failed[0] as ConnectionRow }
  }
}
