<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useLibraryStore } from '../stores/library'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const library = useLibraryStore()
const router = useRouter()

function handleLogout() {
  auth.logout()
  router.push('/')
}

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: '📊' },
  { name: 'Library', path: '/library', icon: '🎵' },
  { name: 'Import', path: '/import', icon: '📥' },
  { name: 'Discover', path: '/discover', icon: '🔮' },
  { name: 'Settings', path: '/settings', icon: '⚙️' }
]

// Mobile drawer state
const isDrawerOpen = ref(false)
const drawerRef = ref(null)

function toggleDrawer() {
  isDrawerOpen.value = !isDrawerOpen.value
}

function closeDrawer() {
  isDrawerOpen.value = false
}

function handleEscape(e) {
  if (e.key === 'Escape' && isDrawerOpen.value) {
    closeDrawer()
  }
}

// Focus trap: cycle focus within drawer when open
function handleFocusTrap(e) {
  if (!isDrawerOpen.value || e.key !== 'Tab' || !drawerRef.value) return

  const focusable = drawerRef.value.querySelectorAll(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )
  if (focusable.length === 0) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

// Move focus into drawer when it opens
watch(isDrawerOpen, async (open) => {
  if (open) {
    await nextTick()
    if (drawerRef.value) {
      const firstFocusable = drawerRef.value.querySelector(
        'a[href], button:not([disabled])'
      )
      firstFocusable?.focus()
    }
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
  document.addEventListener('keydown', handleFocusTrap)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
  document.removeEventListener('keydown', handleFocusTrap)
})
</script>

<template>
  <!-- Desktop sidebar (unchanged) -->
  <aside class="fixed inset-y-0 left-0 z-50 hidden w-64 bg-zinc-900 border-r border-zinc-800 lg:block">
    <div class="flex flex-col h-full">
      <!-- Logo -->
      <div class="flex items-center gap-2 px-6 py-5 border-b border-zinc-800">
        <span class="text-2xl">🎧</span>
        <span class="text-xl font-bold text-white">TuneCraft</span>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-3 py-4 space-y-1" role="navigation" aria-label="Main navigation">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          :aria-label="item.name"
          class="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
          :class="$route.path === item.path
            ? 'bg-indigo-600 text-white'
            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'"
        >
          <span>{{ item.icon }}</span>
          {{ item.name }}
        </router-link>
      </nav>

      <!-- User section -->
      <div class="p-4 border-t border-zinc-800" aria-label="User menu">
        <div class="flex items-center gap-3">
          <img
            v-if="auth.userPicture"
            :src="auth.userPicture"
            :alt="auth.userName"
            class="w-10 h-10 rounded-full"
          />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">{{ auth.userName }}</p>
            <p class="text-xs text-zinc-500 truncate">{{ auth.userEmail }}</p>
          </div>
        </div>
        <button
          @click="handleLogout"
          aria-label="Log out"
          class="w-full mt-3 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  </aside>

  <!-- Mobile header with hamburger -->
  <header class="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-zinc-900 border-b border-zinc-800 lg:hidden">
    <button
      @click="toggleDrawer"
      aria-label="Open menu"
      :aria-expanded="isDrawerOpen"
      class="p-1 text-zinc-400 hover:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
    <span class="text-xl">🎧</span>
    <span class="font-bold text-white">TuneCraft</span>
  </header>

  <!-- Mobile drawer backdrop -->
  <Teleport to="body">
    <Transition name="backdrop">
      <div
        v-if="isDrawerOpen"
        @click="closeDrawer"
        class="fixed inset-0 z-40 bg-black/50 lg:hidden"
        aria-hidden="true"
      />
    </Transition>

    <!-- Mobile drawer -->
    <aside
      ref="drawerRef"
      role="dialog"
      aria-label="Navigation menu"
      :aria-hidden="!isDrawerOpen"
      class="fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800 transform transition-transform duration-200 ease-in-out lg:hidden"
      :class="isDrawerOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex flex-col h-full">
        <!-- Drawer header with close button -->
        <div class="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🎧</span>
            <span class="text-xl font-bold text-white">TuneCraft</span>
          </div>
          <button
            @click="closeDrawer"
            aria-label="Close menu"
            class="p-1 text-zinc-400 hover:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 px-3 py-4 space-y-1" role="navigation" aria-label="Mobile navigation">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            :aria-label="item.name"
            @click="closeDrawer"
            class="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
            :class="$route.path === item.path
              ? 'bg-indigo-600 text-white'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'"
          >
            <span>{{ item.icon }}</span>
            {{ item.name }}
          </router-link>
        </nav>

        <!-- User section -->
        <div class="p-4 border-t border-zinc-800" aria-label="User menu">
          <div class="flex items-center gap-3">
            <img
              v-if="auth.userPicture"
              :src="auth.userPicture"
              :alt="auth.userName"
              class="w-10 h-10 rounded-full"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-white truncate">{{ auth.userName }}</p>
              <p class="text-xs text-zinc-500 truncate">{{ auth.userEmail }}</p>
            </div>
          </div>
          <button
            @click="handleLogout"
            aria-label="Log out"
            class="w-full mt-3 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  </Teleport>
</template>

<style scoped>
/* Backdrop fade transition */
.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 200ms ease-in-out;
}
.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}
</style>
