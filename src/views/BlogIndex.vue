<script setup>
// Guides index (public page, prerendered at build by scripts/prerender.mjs).
// Keep the title in sync with routeTitles in src/router.js and the /blog head in scripts/prerender.mjs.
import { BLOG_POSTS, formatPostDate } from '../content/posts'
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-10 md:py-16">
    <router-link to="/" class="text-sm text-indigo-400 hover:text-indigo-300">&larr; TuneCraft</router-link>
    <h1 class="text-3xl font-bold text-white mt-4 mb-2">TuneCraft guides</h1>
    <p class="text-zinc-400 mb-8 leading-relaxed">
      How to get your own listening history out of YouTube, Shazam and scrobbling services, and what to do with it.
      Steps checked against the services' own help pages.
    </p>

    <ul class="space-y-4">
      <li
        v-for="post in BLOG_POSTS"
        :key="post.slug"
        class="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
      >
        <h2 class="text-lg font-semibold mb-1">
          <a :href="`/blog/${post.slug}`" class="text-white hover:text-indigo-300">{{ post.title }}</a>
        </h2>
        <p class="text-sm text-zinc-500 mb-2">
          <time :datetime="post.date">{{ formatPostDate(post.date) }}</time> · {{ post.readingMinutes }} min read
        </p>
        <p class="text-zinc-400 leading-relaxed">{{ post.description }}</p>
      </li>
    </ul>

    <p class="text-xs text-zinc-500 mt-10">
      <router-link to="/privacy" class="hover:text-zinc-300">Privacy</router-link>
      <span class="mx-2" aria-hidden="true">·</span>
      <router-link to="/terms" class="hover:text-zinc-300">Terms</router-link>
    </p>
  </div>
</template>
