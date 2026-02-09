<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { api } from '../services/api'
import {
  isPushSupported,
  getPermissionStatus,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed
} from '../services/push-notifications'

const auth = useAuthStore()

// Push notification state
const pushSupported = ref(false)
const pushEnabled = ref(false)
const pushPermission = ref('default')
const pushLoading = ref(false)

onMounted(async () => {
  pushSupported.value = isPushSupported()
  if (pushSupported.value) {
    pushPermission.value = getPermissionStatus()
    pushEnabled.value = await isSubscribed()
  }
})

async function togglePush() {
  pushLoading.value = true
  try {
    if (pushEnabled.value) {
      await unsubscribeFromPush()
      pushEnabled.value = false
    } else {
      await subscribeToPush()
      pushEnabled.value = true
      pushPermission.value = getPermissionStatus()
    }
  } catch (e) {
    console.error('Push toggle error:', e)
    // Re-check actual state after error
    pushPermission.value = getPermissionStatus()
    pushEnabled.value = await isSubscribed()
  } finally {
    pushLoading.value = false
  }
}

// Export state
const isExporting = ref(false)
const exportError = ref('')

// Delete state
const showDeleteModal = ref(false)
const deleteConfirmation = ref('')
const isDeleting = ref(false)
const deleteError = ref('')

async function exportLibrary() {
  isExporting.value = true
  exportError.value = ''

  try {
    const data = await api.exportData()

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tunecraft-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    exportError.value = error.message || 'Failed to export data'
  } finally {
    isExporting.value = false
  }
}

function openDeleteModal() {
  showDeleteModal.value = true
  deleteConfirmation.value = ''
  deleteError.value = ''
}

function closeDeleteModal() {
  showDeleteModal.value = false
  deleteConfirmation.value = ''
  deleteError.value = ''
}

async function confirmDelete() {
  if (deleteConfirmation.value !== 'DELETE') {
    deleteError.value = 'Please type DELETE to confirm'
    return
  }

  isDeleting.value = true
  deleteError.value = ''

  try {
    await api.deleteAllData()
    closeDeleteModal()
    // Redirect to home or show success message
    window.location.href = '/'
  } catch (error) {
    deleteError.value = error.message || 'Failed to delete data'
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="p-6 lg:p-8" role="main">
    <h1 class="text-2xl font-bold text-white mb-6">Settings</h1>

    <!-- Account -->
    <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
      <h3 class="font-semibold text-white mb-4">Account</h3>
      <div class="flex items-center gap-4">
        <img
          v-if="auth.userPicture"
          :src="auth.userPicture"
          :alt="auth.userName"
          class="w-16 h-16 rounded-full"
        />
        <div>
          <p class="font-medium text-white">{{ auth.userName }}</p>
          <p class="text-sm text-zinc-500">{{ auth.userEmail }}</p>
        </div>
      </div>
    </div>

    <!-- Connected Services -->
    <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
      <h3 class="font-semibold text-white mb-4">Connected Services</h3>
      <div class="space-y-3">
        <div class="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
          <div class="flex items-center gap-3">
            <span class="text-xl">📺</span>
            <span class="text-white">YouTube</span>
          </div>
          <div class="flex items-center gap-3">
            <span v-if="auth.hasYouTubeAccess" class="text-sm text-green-500">Connected</span>
            <button
              v-if="auth.hasYouTubeAccess"
              @click="auth.disconnectYouTube()"
              class="text-sm text-zinc-400 hover:text-red-400 transition-colors"
            >
              Disconnect
            </button>
            <button
              v-else
              @click="auth.connectYouTube()"
              class="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Connect
            </button>
          </div>
        </div>
        <div class="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
          <div class="flex items-center gap-3">
            <span class="text-xl">🎤</span>
            <span class="text-white">Shazam</span>
          </div>
          <span class="text-sm text-zinc-500">Import CSV</span>
        </div>
        <div class="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
          <div class="flex items-center gap-3">
            <span class="text-xl">🎧</span>
            <span class="text-white">Spotify</span>
          </div>
          <span class="text-sm text-zinc-500">Coming soon</span>
        </div>
      </div>
    </div>

    <!-- Notifications -->
    <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
      <h3 class="font-semibold text-white mb-4">Notifications</h3>
      <div class="space-y-3">
        <!-- Push notifications toggle -->
        <div class="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
          <div>
            <p class="text-white">Push Notifications</p>
            <p class="text-sm text-zinc-500 mt-0.5">
              <template v-if="!pushSupported">Not supported in this browser</template>
              <template v-else-if="pushPermission === 'denied'">Notifications blocked. Enable in browser settings.</template>
              <template v-else-if="pushEnabled">Enabled</template>
              <template v-else>Disabled</template>
            </p>
          </div>
          <button
            v-if="pushSupported && pushPermission !== 'denied'"
            @click="togglePush"
            :disabled="pushLoading"
            role="switch"
            :aria-checked="pushEnabled"
            aria-label="Toggle push notifications"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            :class="pushEnabled ? 'bg-indigo-600' : 'bg-zinc-700'"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
              :class="pushEnabled ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- Data -->
    <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h3 class="font-semibold text-white mb-4">Data</h3>
      <div class="space-y-3">
        <button
          @click="exportLibrary"
          :disabled="isExporting"
          aria-label="Export library as JSON"
          class="w-full text-left p-3 bg-zinc-800 rounded-lg text-white hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
        >
          <span>Export library (JSON)</span>
          <span v-if="isExporting" class="text-zinc-400">Exporting...</span>
        </button>
        <p v-if="exportError" class="text-red-400 text-sm px-3">{{ exportError }}</p>

        <button
          @click="openDeleteModal"
          aria-label="Delete all data"
          class="w-full text-left p-3 bg-zinc-800 rounded-lg text-red-400 hover:bg-zinc-700 transition-colors"
        >
          Delete all data
        </button>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm deletion"
      @click.self="closeDeleteModal"
    >
      <div class="relative bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
        <button
          @click="closeDeleteModal"
          class="absolute top-4 right-4 text-zinc-400 hover:text-white"
          aria-label="Close dialog"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h3 class="text-xl font-bold text-white mb-4">Delete All Data</h3>

        <p class="text-zinc-400 mb-4">
          This will permanently delete all your data:
        </p>
        <ul class="text-zinc-400 mb-4 list-disc list-inside space-y-1">
          <li>All songs in your library</li>
          <li>All playlists</li>
          <li>All play history</li>
        </ul>

        <p class="text-zinc-400 mb-4">
          Type <span class="font-mono text-red-400 font-bold">DELETE</span> to confirm:
        </p>

        <input
          v-model="deleteConfirmation"
          type="text"
          placeholder="Type DELETE"
          aria-label="Type DELETE to confirm deletion"
          class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 mb-4"
          @keyup.enter="confirmDelete"
        />

        <p v-if="deleteError" class="text-red-400 text-sm mb-4">{{ deleteError }}</p>

        <div class="flex gap-3">
          <button
            @click="closeDeleteModal"
            class="flex-1 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="confirmDelete"
            :disabled="isDeleting || deleteConfirmation !== 'DELETE'"
            class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isDeleting ? 'Deleting...' : 'Delete Everything' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
