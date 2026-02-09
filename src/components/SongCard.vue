<script setup>
import { ref, computed } from 'vue'
import { useLibraryStore } from '../stores/library'
import { api } from '../services/api'
import GenreMoodEditor from './GenreMoodEditor.vue'

const props = defineProps({
  song: {
    type: Object,
    required: true
  }
})

const library = useLibraryStore()
const showTagEditor = ref(false)

// Check if song has a valid YouTube video
const hasValidYouTube = computed(() => {
  // Invalid if: placeholder ID (shz*) OR youtube_status is pending/not_found
  if (props.song.youtube_id?.startsWith('shz')) return false
  if (props.song.youtube_status === 'pending') return false
  if (props.song.youtube_status === 'not_found') return false
  return true
})

function playOnYouTube() {
  if (!hasValidYouTube.value) return
  // Open YouTube immediately — never block the user
  window.open(`https://www.youtube.com/watch?v=${props.song.youtube_id}`, '_blank')
  // Log play event and update count in background (fire-and-forget)
  logPlayEvent()
}

async function logPlayEvent() {
  try {
    // Log to play_history table
    await api.logPlay(props.song.id)
    // Optimistically update local play count in the store
    library.incrementPlayCount(props.song.id)
  } catch (e) {
    // Silent fail — don't interrupt user experience for tracking
    console.error('Failed to log play:', e)
  }
}
</script>

<template>
  <div
    role="article"
    :aria-label="song.title + (song.artist ? ' by ' + song.artist : '')"
    :class="[
      'flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl transition-colors',
      hasValidYouTube ? 'hover:border-zinc-700' : 'opacity-50'
    ]"
  >
    <!-- Thumbnail -->
    <img
      v-if="song.thumbnail"
      :src="song.thumbnail"
      :alt="song.title"
      :class="[
        'w-14 h-14 rounded object-cover',
        hasValidYouTube ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
      ]"
      @click="playOnYouTube"
    />
    <div v-else class="w-14 h-14 bg-zinc-800 rounded flex items-center justify-center" aria-hidden="true">
      <span class="text-2xl">🎵</span>
    </div>

    <!-- Info -->
    <div class="flex-1 min-w-0">
      <p
        :class="[
          'font-medium truncate',
          hasValidYouTube ? 'text-white cursor-pointer hover:text-indigo-400' : 'text-zinc-400 cursor-default'
        ]"
        @click="playOnYouTube"
      >
        {{ song.title }}
      </p>
      <p class="text-sm text-zinc-500 truncate">
        {{ song.artist || song.channel }}
      </p>
      <div class="flex items-center gap-3 mt-1 text-xs text-zinc-600">
        <span v-if="song.play_count">{{ song.play_count }} plays</span>
        <span v-if="song.popularity" class="text-indigo-400">🔥 {{ song.popularity }}%</span>
        <span v-if="song.genres?.length" class="text-zinc-500">
          {{ song.genres.slice(0, 2).join(', ') }}
        </span>
        <span v-if="!hasValidYouTube" class="text-amber-500">
          ⚠️ No YouTube link
        </span>
        <button
          @click="showTagEditor = true"
          :aria-label="(song.genres?.length || song.moods?.length ? 'Edit tags for ' : 'Add tags to ') + song.title"
          class="text-indigo-400 hover:text-indigo-300"
        >
          {{ song.genres?.length || song.moods?.length ? 'edit tags' : '+ add tags' }}
        </button>
      </div>
    </div>

    <!-- Play button (only show if valid YouTube) -->
    <button
      v-if="hasValidYouTube"
      @click="playOnYouTube"
      class="p-2 text-white bg-indigo-600 rounded-full hover:bg-indigo-700 transition-colors"
      :aria-label="'Play ' + song.title + ' on YouTube'"
      title="Play on YouTube"
    >
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
      </svg>
    </button>
    <!-- Placeholder for alignment when no play button -->
    <div v-else class="w-9 h-9" />

    <!-- Tag Editor Modal -->
    <GenreMoodEditor
      v-if="showTagEditor"
      :song="song"
      @close="showTagEditor = false"
    />
  </div>
</template>
