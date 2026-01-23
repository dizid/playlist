<script setup>
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div class="p-6 lg:p-8">
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
        <button class="w-full text-left p-3 bg-zinc-800 rounded-lg text-white hover:bg-zinc-700 transition-colors">
          Export library (JSON)
        </button>
        <button class="w-full text-left p-3 bg-zinc-800 rounded-lg text-red-400 hover:bg-zinc-700 transition-colors">
          Delete all data
        </button>
      </div>
    </div>
  </div>
</template>
