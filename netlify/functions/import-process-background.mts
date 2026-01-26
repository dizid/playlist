// Background function for processing import jobs
// Named with .background. to enable Netlify Background Functions (15-min timeout)

import type { Context, Config } from "@netlify/functions"
import { getDb } from './_shared/db'
import { validateSession, unauthorizedResponse, jsonResponse, errorResponse } from './_shared/auth'
import { searchYouTubeVideo } from './_shared/youtube'
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
function hashCode(str: string): number {
  return Array.from(str).reduce((hash, char) => {
    return ((hash << 5) - hash) + char.charCodeAt(0) | 0
  }, 0)
}

interface SongPayload {
  youtubeId?: string
  title: string
  artist?: string
  channel?: string
  thumbnail?: string
  source?: string
}

export default async (req: Request, context: Context) => {
  // Validate session
  const session = await validateSession(req)
  if (!session) {
    return unauthorizedResponse()
  }

  const userId = session.user.id
  const sql = getDb()

  try {
    const body = await req.json()
    const { jobId } = body

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
              // Fallback to placeholder
              const hashInput = `${song.artist}:${song.title}`.toLowerCase()
              youtubeId = `shz${Math.abs(hashCode(hashInput)).toString(36).slice(0, 8)}`
              youtubeStatus = 'not_found'
            }
            await delay(RATE_LIMIT_MS)
          } else if (!youtubeId) {
            // No artist/title to search
            const hashInput = `${song.artist || ''}:${song.title}`.toLowerCase()
            youtubeId = `shz${Math.abs(hashCode(hashInput)).toString(36).slice(0, 8)}`
            youtubeStatus = 'not_found'
          }

          // Insert or update song
          const result = await sql`
            INSERT INTO songs (user_id, youtube_id, youtube_status, title, artist, channel, thumbnail, source)
            VALUES (
              ${userId},
              ${youtubeId},
              ${youtubeStatus},
              ${song.title},
              ${song.artist || null},
              ${song.channel || null},
              ${thumbnail},
              ${song.source || 'import'}
            )
            ON CONFLICT (user_id, youtube_id) DO UPDATE SET
              title = EXCLUDED.title,
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
          } else {
            skippedItems++
          }
        } catch (err) {
          console.error(`Error processing song: ${song.title}`, err)
          skippedItems++
        }

        processedItems++
      }

      // Update progress after each batch
      await sql`
        UPDATE import_jobs
        SET
          processed_items = ${processedItems},
          inserted_items = ${insertedItems},
          skipped_items = ${skippedItems},
          updated_at = NOW()
        WHERE id = ${jobId}::uuid
      `

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

    // Send notifications
    await sendNotifications(sql, job, insertedItems, skippedItems, processedItems)

    return jsonResponse({
      status: 'completed',
      processedItems,
      insertedItems,
      skippedItems
    })
  } catch (error) {
    console.error('Background import error:', error)

    // Try to mark job as failed
    try {
      const body = await req.clone().json()
      if (body.jobId) {
        await sql`
          UPDATE import_jobs
          SET status = 'failed', error_message = ${error instanceof Error ? error.message : 'Unknown error'}
          WHERE id = ${body.jobId}::uuid
        `
      }
    } catch {
      // Ignore - couldn't update job status
    }

    const message = error instanceof Error ? error.message : 'Internal server error'
    return errorResponse(message, 500)
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
