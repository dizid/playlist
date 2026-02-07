<script setup>
import { ref, computed } from 'vue'
import { useLibraryStore } from '../stores/library'

const props = defineProps({
  song: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'saved'])

const library = useLibraryStore()

// Local state for editing
const selectedGenres = ref([...(props.song.genres || [])])
const selectedMoods = ref([...(props.song.moods || [])])
const isSaving = ref(false)

// Available options (our taxonomy)
const genreOptions = ['rock', 'pop', 'electronic', 'hip-hop', 'r&b', 'jazz', 'metal', 'indie', 'folk', 'classical']
const moodOptions = ['energetic', 'chill', 'melancholic', 'upbeat', 'dark', 'romantic']

// Check if changes were made
const hasChanges = computed(() => {
  const origGenres = props.song.genres || []
  const origMoods = props.song.moods || []

  if (selectedGenres.value.length !== origGenres.length) return true
  if (selectedMoods.value.length !== origMoods.length) return true

  return !selectedGenres.value.every(g => origGenres.includes(g)) ||
         !selectedMoods.value.every(m => origMoods.includes(m))
})

function toggleGenre(genre) {
  const index = selectedGenres.value.indexOf(genre)
  if (index >= 0) {
    selectedGenres.value.splice(index, 1)
  } else {
    selectedGenres.value.push(genre)
  }
}

function toggleMood(mood) {
  const index = selectedMoods.value.indexOf(mood)
  if (index >= 0) {
    selectedMoods.value.splice(index, 1)
  } else {
    selectedMoods.value.push(mood)
  }
}

async function save() {
  if (!hasChanges.value) {
    emit('close')
    return
  }

  isSaving.value = true
  try {
    await library.updateSongTags(props.song.id, {
      genres: selectedGenres.value,
      moods: selectedMoods.value
    })
    emit('saved')
    emit('close')
  } catch (e) {
    console.error('Failed to save tags:', e)
  } finally {
    isSaving.value = false
  }
}

function cancel() {
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="tag-editor-title" @click.self="cancel">
    <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h3 id="tag-editor-title" class="text-lg font-semibold text-white">Edit Tags</h3>
        <button @click="cancel" aria-label="Close tag editor" class="text-zinc-500 hover:text-white">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Song info -->
      <div class="flex items-center gap-3 mb-6 p-3 bg-zinc-800/50 rounded-lg">
        <img
          v-if="song.thumbnail"
          :src="song.thumbnail"
          :alt="song.title"
          class="w-12 h-12 rounded object-cover"
        />
        <div class="min-w-0 flex-1">
          <p class="text-white font-medium truncate">{{ song.title }}</p>
          <p class="text-sm text-zinc-400 truncate">{{ song.artist || song.channel }}</p>
        </div>
      </div>

      <!-- Genres -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-zinc-400 mb-2">Genres</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="genre in genreOptions"
            :key="genre"
            @click="toggleGenre(genre)"
            :aria-pressed="selectedGenres.includes(genre)"
            :aria-label="'Genre: ' + genre"
            :class="[
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              selectedGenres.includes(genre)
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
            ]"
          >
            {{ genre }}
          </button>
        </div>
      </div>

      <!-- Moods -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-zinc-400 mb-2">Moods</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="mood in moodOptions"
            :key="mood"
            @click="toggleMood(mood)"
            :aria-pressed="selectedMoods.includes(mood)"
            :aria-label="'Mood: ' + mood"
            :class="[
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              selectedMoods.includes(mood)
                ? 'bg-purple-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
            ]"
          >
            {{ mood }}
          </button>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3">
        <button
          @click="cancel"
          class="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          @click="save"
          :disabled="!hasChanges || isSaving"
          :class="[
            'px-4 py-2 rounded-lg font-medium transition-colors',
            hasChanges && !isSaving
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          ]"
        >
          {{ isSaving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </div>
  </div>
</template>
