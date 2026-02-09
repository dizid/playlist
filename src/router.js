import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'landing',
    component: () => import('./views/Landing.vue')
  },
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: () => import('./views/AuthCallback.vue')
  },
  {
    path: '/youtube/callback',
    name: 'youtube-callback',
    component: () => import('./views/YouTubeCallback.vue')
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('./views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/library',
    name: 'library',
    component: () => import('./views/Library.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/import',
    name: 'import',
    component: () => import('./views/Import.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/playlist/:id',
    name: 'playlist',
    component: () => import('./views/Playlist.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/discover',
    name: 'discover',
    component: () => import('./views/Discovery.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('./views/Settings.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Auth guard - check session via Pinia store
// Note: This runs after Pinia is installed (see main.js order)
router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth) {
    // Dynamically import the store to avoid circular dependencies
    const { useAuthStore } = await import('./stores/auth')
    const authStore = useAuthStore()

    // If not authenticated, try to restore session from Neon Auth cookie
    if (!authStore.isAuthenticated) {
      await authStore.restoreSession()
    }

    // After restore attempt, check again
    if (!authStore.isAuthenticated) {
      return next({ name: 'landing' })
    }
  }

  next()
})

// Per-route page titles for SEO
const routeTitles = {
  'landing': 'TuneCraft - Your Music Layer on YouTube',
  'dashboard': 'Dashboard | TuneCraft',
  'library': 'Library | TuneCraft',
  'import': 'Import | TuneCraft',
  'discover': 'Discover | TuneCraft',
  'settings': 'Settings | TuneCraft',
  'playlist': 'Playlist | TuneCraft',
  'auth-callback': 'Signing in... | TuneCraft',
  'youtube-callback': 'Connecting YouTube... | TuneCraft'
}

router.afterEach((to) => {
  // Set page title based on route
  document.title = routeTitles[to.name] || 'TuneCraft'

  // Don't index authenticated pages
  let robotsMeta = document.querySelector('meta[name="robots"]')
  if (!robotsMeta) {
    robotsMeta = document.createElement('meta')
    robotsMeta.name = 'robots'
    document.head.appendChild(robotsMeta)
  }
  robotsMeta.content = to.meta.requiresAuth ? 'noindex, nofollow' : 'index, follow'
})

export default router
