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

// Auth guard - check for Neon Auth session token
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('tunelayer_session')

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'landing' })
  } else {
    next()
  }
})

export default router
