// Background function for processing import jobs
// Named with .background. to enable Netlify Background Functions (15-min timeout)

import type { Context, Config } from "@netlify/functions"
import { getDb } from './_shared/db'
import { validateSession, unauthorizedResponse, jsonResponse, errorResponse } from './_shared/auth'
import { searchYouTubeVideo, youtubeQuotaExceeded } from './_shared/youtube'
import { placeholderYouTubeId } from './_shared/placeholder-id'
import { sendImportCompletionEmail } from './_shared/resend'
import { sendPushNotificationToMany, createImportCompletionPayload, type PushSubscription } from './_shared/webpush'

// Rate limit: 200ms between YouTube API requests
const RATE_LIMIT_MS = 200

// Batch size for database operations
const DB_BATCH_SIZE = 50

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Simple hash function for placeholder IDs

interface SongPayload {
  youtubeId?: string
  title: string
  artist?: string
  channel?: string
  thumbnail?: string
  source?: string
  playCount?: number    // Takeout: how often the song is in the watch history
  lastPlayed?: string   // Takeout: ISO date of the newest play
  firstPlayed?: string  // Takeout: ISO date of the oldest play
}

// Highest play count one import may set for a song (guards against odd payloads)
const MAX_IMPORTED_PLAYS = 100000

/** A whole number of plays from the payload, or 0. */
function importedPlayCount(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? Math.min(value, MAX_IMPORTED_PLAYS)
    : 0
}

/** An ISO date between 2005 and tomorrow from the payload, or null. */
function importedPlayDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const time = Date.parse(value)
  if (!Number.isFinite(time) || time < Date.UTC(2005, 0, 1) || time > Date.now() + 86400000) return null
  return new Date(time).toISOString()
}

export default async (req: Request, context: Context) => {
  // Validate session
  const session = await validateSession(req)
  if (!session) {
    return unauthorizedResponse()
  }

  const userId = session.user.id
  const sql = getDb()
  let jobId: string | null = null // Capture early for error handler

  try {
    const body = await req.json()
    jobId = body.jobId

    if (!jobId) {
      return errorResponse('Missing jobId', 400)
    }

    // Get the job
    const jobs = await sql`
      SELECT * FROM import_jobs
      WHERE id = ${jobId}::uuid AND user_id = ${userId}
    `

    if (jobs.length === 0) {
      return errorResponse('Job not found', 404)
    }

    const job = jobs[0]

    if (job.status !== 'pending') {
      return jsonResponse({ message: 'Job already processed or processing', status: job.status })
    }

    // Mark job as processing
    await sql`
      UPDATE import_jobs
      SET status = 'processing', started_at = NOW()
      WHERE id = ${jobId}::uuid
    `

    const songs: SongPayload[] = job.payload as SongPayload[]
    let processedItems = 0
    let insertedItems = 0
    let skippedItems = 0

    console.log(`Starting import job ${jobId}: ${songs.length} songs`)

    // Process songs in batches
    for (let i = 0; i < songs.length; i += DB_BATCH_SIZE) {
      const batch = songs.slice(i, i + DB_BATCH_SIZE)
      const batchInsertedIds: string[] = [] // new rows in this batch (cleanup if the job is deleted)

      for (const song of batch) {
        try {
          // Determine YouTube ID and status
          let youtubeId = song.youtubeId
          let youtubeStatus = 'valid'
          let thumbnail = song.thumbnail || null

          // If no YouTube ID, search for one
          if (!youtubeId && song.artist && song.title) {
            const ytResult = await searchYouTubeVideo(song.artist, song.title)
            if (ytResult) {
              youtubeId = ytResult.videoId
              thumbnail = ytResult.thumbnail
              youtubeStatus = 'valid'
            } else {
              // Fallback to placeholder. Quota used up: 'pending', so "auto-tag"
              // (enrich) can still find the video later (was 'not_found' for good)
              youtubeId = placeholderYouTubeId(song.artist, song.title)
              youtubeStatus = youtubeQuotaExceeded() ? 'pending' : 'not_found'
            }
            await delay(RATE_LIMIT_MS)
          } else if (!youtubeId) {
            // No artist/title to search
            youtubeId = placeholderYouTubeId(song.artist || '', song.title)
            youtubeStatus = 'not_found'
          }

          // Plays from a Takeout watch history (0 / null for other imports).
          // On re-import GREATEST/LEAST keep counts and dates from adding up twice.
          const playCount = importedPlayCount(song.playCount)
          const lastPlayed = importedPlayDate(song.lastPlayed)
          const firstPlayed = importedPlayDate(song.firstPlayed)

          // Insert or update song. A placeholder title ("Video <id>", from older
          // Takeout imports) never replaces a real one; a real title does
          // replace a placeholder, which repairs songs from those imports.
          const result = await sql`
            INSERT INTO songs (user_id, youtube_id, youtube_status, title, artist, channel, thumbnail, source, play_count, last_played, first_played)
            VALUES (
              ${userId},
              ${youtubeId},
              ${youtubeStatus},
              ${song.title},
              ${song.artist || null},
              ${song.channel || null},
              ${thumbnail},
              ${song.source || 'import'},
              ${playCount},
              ${lastPlayed}::timestamptz,
              ${firstPlayed}::timestamptz
            )
            ON CONFLICT (user_id, youtube_id) DO UPDATE SET
              title = CASE
                WHEN EXCLUDED.title = 'Video ' || songs.youtube_id THEN songs.title
                ELSE EXCLUDED.title
              END,
              play_count = GREATEST(COALESCE(songs.play_count, 0), EXCLUDED.play_count),
              last_played = GREATEST(songs.last_played, EXCLUDED.last_played),
              first_played = LEAST(songs.first_played, EXCLUDED.first_played),
              artist = COALESCE(EXCLUDED.artist, songs.artist),
              channel = COALESCE(EXCLUDED.channel, songs.channel),
              thumbnail = COALESCE(EXCLUDED.thumbnail, songs.thumbnail),
              youtube_status = CASE
                WHEN songs.youtube_id LIKE 'shz%' THEN EXCLUDED.youtube_status
                ELSE songs.youtube_status
              END,
              updated_at = NOW()
            RETURNING (xmax = 0) as inserted
          `

          // xmax = 0 means it was an INSERT, not UPDATE
          if (result[0]?.inserted) {
            insertedItems++
            batchInsertedIds.push(youtubeId)
          } else {
            skippedItems++
          }
        } catch (err) {
          console.error(`Error processing song: ${song.title}`, err)
          skippedItems++
        }

        processedItems++
      }

      // Update progress after each batch. No row = the job was removed by
      // "Delete all data": stop, and remove the songs this batch added, so a
      // deleted library doesn't fill up again from an import still running.
      const progress = await sql`
        UPDATE import_jobs
        SET
          processed_items = ${processedItems},
          inserted_items = ${insertedItems},
          skipped_items = ${skippedItems},
          updated_at = NOW()
        WHERE id = ${jobId}::uuid
        RETURNING id
      `
      if (progress.length === 0) {
        if (batchInsertedIds.length > 0) {
          await sql`DELETE FROM songs WHERE user_id = ${userId} AND youtube_id = ANY(${batchInsertedIds}::text[])`
        }
        console.log(`Import job ${jobId} stopped: the job was deleted`)
        return jsonResponse({ status: 'cancelled', processedItems })
      }

      console.log(`Import job ${jobId}: processed ${processedItems}/${songs.length}`)
    }

    // Mark job as completed
    await sql`
      UPDATE import_jobs
      SET
        status = 'completed',
        processed_items = ${processedItems},
        inserted_items = ${insertedItems},
        skipped_items = ${skippedItems},
        completed_at = NOW()
      WHERE id = ${jobId}::uuid
    `

    console.log(`Import job ${jobId} completed: ${insertedItems} inserted, ${skippedItems} skipped`)

    // Send notifications (don't let notification failures affect job status)
    try {
      await sendNotifications(sql, job, insertedItems, skippedItems, processedItems)
    } catch (notifErr) {
      console.error('Notification sending failed (job still completed):', notifErr)
    }

    return jsonResponse({
      status: 'completed',
      processedItems,
      insertedItems,
      skippedItems
    })
  } catch (error) {
    console.error('Background import error:', error)

    // Mark job as failed using captured jobId (req body already consumed)
    if (jobId) {
      try {
        await sql`
          UPDATE import_jobs
          SET status = 'failed', error_message = ${error instanceof Error ? error.message : 'Unknown error'}
          WHERE id = ${jobId}::uuid AND user_id = ${userId}
        `
      } catch (updateErr) {
        console.error('Failed to mark job as failed:', updateErr)
      }
    }

    return errorResponse('Internal server error', 500)
  }
}

async function sendNotifications(
  sql: ReturnType<typeof getDb>,
  job: Record<string, unknown>,
  insertedItems: number,
  skippedItems: number,
  totalItems: number
): Promise<void> {
  const userId = job.user_id as string
  const importType = job.type as string

  // Send email notification
  if (job.notify_email && job.email_address) {
    await sendImportCompletionEmail({
      to: job.email_address as string,
      importType,
      insertedCount: insertedItems,
      skippedCount: skippedItems,
      totalCount: totalItems
    })
  }

  // Send push notification
  if (job.notify_push) {
    // Get user's push subscriptions
    const subscriptions = await sql`
      SELECT endpoint, p256dh, auth
      FROM push_subscriptions
      WHERE user_id = ${userId}
    `

    if (subscriptions.length > 0) {
      const pushSubs: PushSubscription[] = subscriptions.map(s => ({
        endpoint: s.endpoint,
        p256dh: s.p256dh,
        auth: s.auth
      }))

      const payload = createImportCompletionPayload(insertedItems, importType)
      const result = await sendPushNotificationToMany(pushSubs, payload)

      // Clean up expired subscriptions
      if (result.expiredEndpoints.length > 0) {
        for (const endpoint of result.expiredEndpoints) {
          await sql`
            DELETE FROM push_subscriptions
            WHERE user_id = ${userId} AND endpoint = ${endpoint}
          `
        }
      }
    }
  }
}

export const config: Config = {
  path: "/.netlify/functions/import-process-background"
}
