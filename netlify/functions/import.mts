import type { Context, Config } from "@netlify/functions"
import { getDb } from './_shared/db'
import { validateSession, unauthorizedResponse, jsonResponse, errorResponse } from './_shared/auth'
import { isValidUuid } from './_shared/validation'

// Max songs per import batch (to keep payload reasonable)
const MAX_BATCH_SIZE = 5000

export default async (req: Request, context: Context) => {
  // Validate session
  const session = await validateSession(req)
  if (!session) {
    return unauthorizedResponse()
  }

  const userId = session.user.id
  const sql = getDb()

  try {
    const url = new URL(req.url)

    // POST /api/import/batch - Create import job and trigger background processing
    if (req.method === 'POST' && url.pathname === '/api/import/batch') {
      const body = await req.json()

      // Validate required fields
      if (!body.type) {
        return errorResponse('Missing required field: type', 400)
      }
      if (!body.songs || !Array.isArray(body.songs)) {
        return errorResponse('Missing required field: songs (array)', 400)
      }
      if (body.songs.length === 0) {
        return errorResponse('No songs to import', 400)
      }
      if (body.songs.length > MAX_BATCH_SIZE) {
        return errorResponse(`Too many songs. Maximum ${MAX_BATCH_SIZE} per batch.`, 400)
      }

      // Check for existing pending/processing job for this user
      const existingJobs = await sql`
        SELECT id, status, total_items, processed_items
        FROM import_jobs
        WHERE user_id = ${userId} AND status IN ('pending', 'processing')
        LIMIT 1
      `

      if (existingJobs.length > 0) {
        const job = existingJobs[0]
        return jsonResponse({
          error: 'Import already in progress',
          existingJobId: job.id,
          status: job.status,
          progress: `${job.processed_items}/${job.total_items}`
        }, 409)
      }

      // Create import job
      const result = await sql`
        INSERT INTO import_jobs (
          user_id,
          type,
          total_items,
          status,
          notify_email,
          notify_push,
          email_address,
          payload
        ) VALUES (
          ${userId},
          ${body.type},
          ${body.songs.length},
          'pending',
          ${body.notifyEmail !== false},
          ${body.notifyPush !== false},
          ${body.email || null},
          ${JSON.stringify(body.songs)}::jsonb
        )
        RETURNING id, status, total_items, created_at
      `

      const job = result[0]

      // Trigger background processing
      // We call our own background function endpoint
      const backgroundUrl = new URL(req.url)
      backgroundUrl.pathname = '/.netlify/functions/import-process-background'

      // Fire and forget - don't await
      fetch(backgroundUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization') || ''
        },
        body: JSON.stringify({ jobId: job.id })
      }).catch(err => {
        console.error('Failed to trigger background processing:', err)
      })

      return jsonResponse({
        jobId: job.id,
        status: job.status,
        totalItems: job.total_items,
        createdAt: job.created_at,
        message: 'Import started. You can close this page safely.'
      }, 202) // 202 Accepted
    }

    // GET /api/import/status/:jobId - Get job status
    if (req.method === 'GET' && url.pathname.startsWith('/api/import/status/')) {
      const pathParts = url.pathname.split('/')
      const jobId = pathParts[pathParts.length - 1]

      if (!jobId || !isValidUuid(jobId)) {
        return errorResponse('Invalid job ID', 400)
      }

      const jobs = await sql`
        SELECT
          id,
          type,
          total_items,
          status,
          processed_items,
          inserted_items,
          skipped_items,
          error_message,
          created_at,
          started_at,
          completed_at
        FROM import_jobs
        WHERE id = ${jobId}::uuid AND user_id = ${userId}
      `

      if (jobs.length === 0) {
        return errorResponse('Job not found', 404)
      }

      return jsonResponse(jobs[0])
    }

    // GET /api/import/active - Get active import job for user
    if (req.method === 'GET' && url.pathname === '/api/import/active') {
      const jobs = await sql`
        SELECT
          id,
          type,
          total_items,
          status,
          processed_items,
          inserted_items,
          skipped_items,
          error_message,
          created_at,
          started_at,
          completed_at
        FROM import_jobs
        WHERE user_id = ${userId} AND status IN ('pending', 'processing')
        ORDER BY created_at DESC
        LIMIT 1
      `

      if (jobs.length === 0) {
        return jsonResponse({ active: false })
      }

      return jsonResponse({ active: true, job: jobs[0] })
    }

    // GET /api/import/history - Get recent import jobs
    if (req.method === 'GET' && url.pathname === '/api/import/history') {
      const jobs = await sql`
        SELECT
          id,
          type,
          total_items,
          status,
          processed_items,
          inserted_items,
          skipped_items,
          created_at,
          completed_at
        FROM import_jobs
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 10
      `

      return jsonResponse(jobs)
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error('Import API error:', error)
    return errorResponse('Internal server error', 500)
  }
}

export const config: Config = {
  path: ["/api/import/batch", "/api/import/status/*", "/api/import/active", "/api/import/history"]
}
