// Service Worker for TuneCraft Push Notifications

// Handle push events
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Push event with no data')
    return
  }

  try {
    const data = event.data.json()

    const options = {
      body: data.body || 'You have a new notification',
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/',
        dateOfArrival: Date.now()
      },
      actions: [
        {
          action: 'open',
          title: 'View'
        },
        {
          action: 'close',
          title: 'Dismiss'
        }
      ]
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'TuneCraft', options)
    )
  } catch (error) {
    console.error('Error showing notification:', error)
  }
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'close') {
    return
  }

  // Get the URL from the notification data
  const url = event.notification.data?.url || '/'

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            // Navigate to the URL and focus the window
            client.navigate(url)
            return client.focus()
          }
        }
        // No window open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated')
  event.waitUntil(clients.claim())
})

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('Service Worker installed')
  self.skipWaiting()
})
