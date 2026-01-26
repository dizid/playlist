// Web Push integration for browser notifications
import webpush from 'web-push'
import { config } from 'dotenv'

// Load .env file for local development
config()

// Get env vars - try Netlify.env first (production), then process.env (local dev)
function getVapidPublicKey(): string {
  return (typeof Netlify !== 'undefined' && Netlify.env?.get('VAPID_PUBLIC_KEY'))
    || process.env.VAPID_PUBLIC_KEY
    || ''
}

function getVapidPrivateKey(): string {
  return (typeof Netlify !== 'undefined' && Netlify.env?.get('VAPID_PRIVATE_KEY'))
    || process.env.VAPID_PRIVATE_KEY
    || ''
}

function getVapidEmail(): string {
  return (typeof Netlify !== 'undefined' && Netlify.env?.get('VAPID_EMAIL'))
    || process.env.VAPID_EMAIL
    || 'mailto:admin@tunecraft.com'
}

export interface PushSubscription {
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushNotificationPayload {
  title: string
  body: string
  url?: string
  icon?: string
}

let vapidConfigured = false

/**
 * Configure VAPID credentials (call once before sending notifications)
 */
function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true

  const publicKey = getVapidPublicKey()
  const privateKey = getVapidPrivateKey()
  const email = getVapidEmail()

  if (!publicKey || !privateKey) {
    console.warn('VAPID keys not configured - push notifications disabled')
    return false
  }

  webpush.setVapidDetails(email, publicKey, privateKey)
  vapidConfigured = true
  return true
}

/**
 * Send push notification to a single subscription
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushNotificationPayload
): Promise<boolean> {
  if (!ensureVapidConfigured()) {
    return false
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth
    }
  }

  try {
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    )
    console.log('Push notification sent successfully')
    return true
  } catch (error: unknown) {
    // Handle expired subscriptions (410 Gone or 404 Not Found)
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const statusCode = (error as { statusCode: number }).statusCode
      if (statusCode === 410 || statusCode === 404) {
        console.log('Push subscription expired or invalid')
        return false
      }
    }
    console.error('Failed to send push notification:', error)
    return false
  }
}

/**
 * Send push notification to multiple subscriptions
 * Returns count of successful sends
 */
export async function sendPushNotificationToMany(
  subscriptions: PushSubscription[],
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number; expiredEndpoints: string[] }> {
  if (!ensureVapidConfigured()) {
    return { success: 0, failed: subscriptions.length, expiredEndpoints: [] }
  }

  let success = 0
  let failed = 0
  const expiredEndpoints: string[] = []

  for (const sub of subscriptions) {
    const result = await sendPushNotification(sub, payload)
    if (result) {
      success++
    } else {
      failed++
      // Track potentially expired subscriptions for cleanup
      expiredEndpoints.push(sub.endpoint)
    }
  }

  return { success, failed, expiredEndpoints }
}

/**
 * Create payload for import completion notification
 */
export function createImportCompletionPayload(
  insertedCount: number,
  importType: string
): PushNotificationPayload {
  const importTypeLabels: Record<string, string> = {
    youtube_playlists: 'YouTube playlists',
    youtube_likes: 'YouTube likes',
    shazam: 'Shazam library',
    takeout: 'Google Takeout'
  }

  const label = importTypeLabels[importType] || importType

  return {
    title: 'Import Complete!',
    body: `${insertedCount} songs from ${label} added to your library`,
    url: '/library',
    icon: '/icon-192.png'
  }
}
