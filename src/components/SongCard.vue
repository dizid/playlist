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
  if (!hasValidYouTube.value) {
    // No linked video yet (e.g. synced from Last.fm): open a YouTube search instead.
    // Free (no API quota) and not logged as a play, since we don't know what gets played.
    const query = [props.song.artist, props.song.title].filter(Boolean).join(' ')
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, '_blank')
    return
  }
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
    class="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl transition-colors hover:border-zinc-700"
  >
    <!-- Thumbnail -->
    <img
      v-if="song.thumbnail"
      :src="song.thumbnail"
      :alt="song.title"
      class="w-14 h-14 rounded object-cover cursor-pointer hover:opacity-80"
      @click="playOnYouTube"
    />
    <div v-else class="w-14 h-14 bg-zinc-800 rounded flex items-center justify-center" aria-hidden="true">
      <span class="text-2xl">🎵</span>
    </div>

    <!-- Info -->
    <div class="flex-1 min-w-0">
      <p
        class="font-medium truncate text-white cursor-pointer hover:text-indigo-400"
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
        <span v-if="!hasValidYouTube" class="text-zinc-500" title="No video linked yet: play opens a YouTube search">
          YouTube search
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

    <!-- Play button: linked video, or a YouTube search when no video is linked yet -->
    <button
      @click="playOnYouTube"
      :class="[
        'p-2 text-white rounded-full transition-colors',
        hasValidYouTube ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-zinc-700 hover:bg-zinc-600'
      ]"
      :aria-label="(hasValidYouTube ? 'Play ' : 'Search YouTube for ') + song.title"
      :title="hasValidYouTube ? 'Play on YouTube' : 'Search on YouTube'"
    >
      <svg v-if="hasValidYouTube" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
      </svg>
      <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.2-5.2m0 0A7.5 7.5 0 1 0 5.2 5.2a7.5 7.5 0 0 0 10.6 10.6Z"/>
      </svg>
    </button>

    <!-- Tag Editor Modal -->
    <GenreMoodEditor
      v-if="showTagEditor"
      :song="song"
      @close="showTagEditor = false"
    />
  </div>
</template>
