<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { api } from '../services/api'

const auth = useAuthStore()

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
          <span class="text-sm text-green-500">Connected</span>
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
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
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
