<script setup>
import { useLibraryStore } from '../stores/library'

const props = defineProps({
  song: {
    type: Object,
    required: true
  }
})

const library = useLibraryStore()

function playOnYouTube() {
  window.open(`https://www.youtube.com/watch?v=${props.song.youtube_id}`, '_blank')
  library.incrementPlayCount(props.song.id)
}

async function setRating(rating) {
  await library.rateSong(props.song.id, rating)
}

const ratingOptions = [
  { value: 'loved', icon: '❤️', label: 'Love' },
  { value: 'liked', icon: '👍', label: 'Like' },
  { value: 'neutral', icon: '➖', label: 'Neutral' },
  { value: 'disliked', icon: '👎', label: 'Dislike' }
]
</script>

<template>
  <div class="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors">
    <!-- Thumbnail -->
    <img
      v-if="song.thumbnail"
      :src="song.thumbnail"
      :alt="song.title"
      class="w-14 h-14 rounded object-cover cursor-pointer hover:opacity-80"
      @click="playOnYouTube"
    />
    <div v-else class="w-14 h-14 bg-zinc-800 rounded flex items-center justify-center">
      <span class="text-2xl">🎵</span>
    </div>

    <!-- Info -->
    <div class="flex-1 min-w-0">
      <p
        class="font-medium text-white truncate cursor-pointer hover:text-indigo-400"
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
      </div>
    </div>

    <!-- Rating -->
    <div class="flex items-center gap-1">
      <button
        v-for="option in ratingOptions"
        :key="option.value"
        @click="setRating(option.value)"
        :title="option.label"
        :class="song.rating === option.value ? 'opacity-100 scale-110' : 'opacity-40 hover:opacity-70'"
        class="text-lg transition-all"
      >
        {{ option.icon }}
      </button>
    </div>

    <!-- Play button -->
    <button
      @click="playOnYouTube"
      class="p-2 text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors"
      title="Play on YouTube"
    >
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
      </svg>
    </button>
  </div>
</template>
