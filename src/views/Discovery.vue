<script setup>
import { ref } from 'vue'

const selectedGenre = ref('all')
const selectedMood = ref('all')

const genres = ['all', 'electronic', 'rock', 'jazz', 'hip-hop', 'pop', 'classical']
const moods = ['all', 'chill', 'energetic', 'melancholic', 'upbeat', 'dark']
</script>

<template>
  <div class="p-6 lg:p-8">
    <h1 class="text-2xl font-bold text-white mb-2">Discover</h1>
    <p class="text-zinc-400 mb-6">Find new music based on your taste</p>

    <!-- Filters -->
    <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
      <h3 class="font-semibold text-white mb-4">Filter by taste</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-zinc-400 mb-2">Genre</label>
          <select
            v-model="selectedGenre"
            class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
          >
            <option v-for="genre in genres" :key="genre" :value="genre">
              {{ genre === 'all' ? 'All genres' : genre.charAt(0).toUpperCase() + genre.slice(1) }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-zinc-400 mb-2">Mood</label>
          <select
            v-model="selectedMood"
            class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
          >
            <option v-for="mood in moods" :key="mood" :value="mood">
              {{ mood === 'all' ? 'All moods' : mood.charAt(0).toUpperCase() + mood.slice(1) }}
            </option>
          </select>
        </div>
      </div>

      <button
        class="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        🔮 Generate Discovery Playlist
      </button>
    </div>

    <!-- Coming Soon -->
    <div class="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl">
      <span class="text-5xl mb-4 block">🔮</span>
      <h3 class="text-xl font-semibold text-white mb-2">Discovery Coming Soon</h3>
      <p class="text-zinc-400">
        Import some music first, then we'll find new tracks based on your taste!
      </p>
    </div>
  </div>
</template>
