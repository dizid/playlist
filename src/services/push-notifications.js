// Push Notifications Service for TuneCraft
// Handles service worker registration and push subscription management

import { getSessionToken } from './auth-client'

// VAPID public key from environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

/**
 * Check if push notifications are supported in this browser
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/**
 * Get current notification permission status
 */
export function getPermissionStatus() {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission // 'granted', 'denied', or 'default'
}

/**
 * Request notification permission from user
 */
export async function requestPermission() {
  if (!isPushSupported()) {
    return { granted: false, reason: 'Push notifications not supported' }
  }

  try {
    const permission = await Notification.requestPermission()
    return {
      granted: permission === 'granted',
      permission
    }
  } catch (error) {
    return { granted: false, reason: error.message }
  }
}

/**
 * Register the service worker
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers not supported')
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    console.log('Service Worker registered:', registration.scope)
    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    throw error
  }
}

/**
 * Convert VAPID public key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush() {
  if (!isPushSupported()) {
    throw new Error('Push notifications not supported')
  }

  if (!VAPID_PUBLIC_KEY) {
    throw new Error('VAPID public key not configured')
  }

  // Request permission first
  const { granted } = await requestPermission()
  if (!granted) {
    throw new Error('Notification permission denied')
  }

  // Get or register service worker
  let registration = await navigator.serviceWorker.ready

  // Subscribe to push
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  })

  // Send subscription to server
  const token = await getSessionToken()

  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      ...subscription.toJSON(),
      userAgent: navigator.userAgent
    })
  })

  if (!response.ok) {
    throw new Error('Failed to save push subscription')
  }

  console.log('Push subscription saved')
  return subscription
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush() {
  if (!isPushSupported()) return

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (subscription) {
    // Unsubscribe locally
    await subscription.unsubscribe()

    // Remove from server
    const token = await getSessionToken()

    const response = await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    })

    if (!response.ok) {
      throw new Error('Failed to remove push subscription from server')
    }

    console.log('Push subscription removed')
  }
}

/**
 * Check if currently subscribed to push
 */
export async function isSubscribed() {
  if (!isPushSupported()) return false

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription !== null
  } catch {
    return false
  }
}

/**
 * Get the current push subscription
 */
export async function getCurrentSubscription() {
  if (!isPushSupported()) return null

  try {
    const registration = await navigator.serviceWorker.ready
    return await registration.pushManager.getSubscription()
  } catch {
    return null
  }
}

/**
 * Initialize push notifications (register SW, subscribe if permitted)
 * Call this on app startup for users who have already granted permission
 */
export async function initializePush() {
  if (!isPushSupported()) {
    console.log('Push notifications not supported')
    return { supported: false }
  }

  try {
    // Always register service worker
    await registerServiceWorker()

    // If permission already granted, ensure we're subscribed
    if (Notification.permission === 'granted') {
      const subscribed = await isSubscribed()
      if (!subscribed) {
        await subscribeToPush()
      }
      return { supported: true, subscribed: true }
    }

    return { supported: true, subscribed: false, permission: Notification.permission }
  } catch (error) {
    console.error('Failed to initialize push:', error)
    return { supported: true, error: error.message }
  }
}
