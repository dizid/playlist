// Resend email integration for import notifications
import { Resend } from 'resend'
import { config } from 'dotenv'

// Load .env file for local development
config()

// Get API key - try Netlify.env first (production), then process.env (local dev)
function getResendApiKey(): string {
  return (typeof Netlify !== 'undefined' && Netlify.env?.get('RESEND_API_KEY'))
    || process.env.RESEND_API_KEY
    || ''
}

function getFromEmail(): string {
  return (typeof Netlify !== 'undefined' && Netlify.env?.get('RESEND_FROM_EMAIL'))
    || process.env.RESEND_FROM_EMAIL
    || 'notifications@tunecraft.com'
}

export interface ImportCompletionEmail {
  to: string
  userName?: string
  importType: string
  insertedCount: number
  skippedCount: number
  totalCount: number
}

/**
 * Send email notification when import completes
 */
export async function sendImportCompletionEmail(data: ImportCompletionEmail): Promise<boolean> {
  const apiKey = getResendApiKey()

  if (!apiKey || apiKey === 're_YOUR_API_KEY_HERE') {
    console.warn('RESEND_API_KEY not configured - skipping email notification')
    return false
  }

  const resend = new Resend(apiKey)
  const fromEmail = getFromEmail()

  const importTypeLabels: Record<string, string> = {
    youtube_playlists: 'YouTube Playlists',
    youtube_likes: 'YouTube Liked Videos',
    shazam: 'Shazam Library',
    takeout: 'Google Takeout'
  }

  const importLabel = importTypeLabels[data.importType] || data.importType

  try {
    await resend.emails.send({
      from: fromEmail,
      to: data.to,
      subject: 'Your TuneCraft import is complete!',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #18181b; color: #fafafa; padding: 40px 20px; margin: 0;">
  <div style="max-width: 500px; margin: 0 auto;">
    <h1 style="color: #818cf8; margin-bottom: 24px;">Import Complete!</h1>

    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6;">
      Hi${data.userName ? ` ${data.userName}` : ''},
    </p>

    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6;">
      Your <strong style="color: #fafafa;">${importLabel}</strong> import has finished processing.
    </p>

    <div style="background-color: #27272a; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="color: #71717a;">Songs added</span>
        <span style="color: #22c55e; font-weight: 600;">${data.insertedCount}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="color: #71717a;">Duplicates skipped</span>
        <span style="color: #a1a1aa;">${data.skippedCount}</span>
      </div>
      <div style="display: flex; justify-content: space-between; border-top: 1px solid #3f3f46; padding-top: 12px;">
        <span style="color: #71717a;">Total processed</span>
        <span style="color: #fafafa; font-weight: 600;">${data.totalCount}</span>
      </div>
    </div>

    <a href="https://tunecraft.com/library" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px;">
      View Your Library
    </a>

    <p style="color: #52525b; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #27272a;">
      TuneCraft - Your music taste layer on YouTube
    </p>

    <p style="color: #52525b; font-size: 12px; margin-top: 12px;">
      If you didn't expect this email, you can safely ignore it.
      Check your spam folder if you're not seeing TuneCraft emails.
    </p>
  </div>
</body>
</html>
      `
    })

    console.log(`Import completion email sent to ${data.to}`)
    return true
  } catch (error) {
    console.error('Failed to send email:', error)
    return false
  }
}
