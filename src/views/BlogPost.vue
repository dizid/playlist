<script setup>
// One guide (public page, prerendered at build by scripts/prerender.mjs).
// The post body is trusted static HTML from src/content/posts (checked at build time).
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { BLOG_POSTS, findPost, formatPostDate } from '../content/posts'

const route = useRoute()
const post = computed(() => findPost(String(route.params.slug ?? '')))
// Up to 3 other guides under each post (internal links)
const otherPosts = computed(() => BLOG_POSTS.filter((other) => other.slug !== post.value?.slug).slice(0, 3))

onMounted(() => {
  // Browser only (the router's afterEach has no per-post title)
  document.title = post.value ? `${post.value.title} | TuneCraft` : 'Guide not found | TuneCraft'
  if (!post.value) {
    // Unknown slug: the SPA shell answers 200, so keep it out of search results
    document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex, nofollow')
  }
})
</script>

<template>
  <article v-if="post" class="max-w-3xl mx-auto px-4 py-10 md:py-16">
    <a href="/blog" class="text-sm text-indigo-400 hover:text-indigo-300">&larr; Guides</a>
    <h1 class="text-3xl md:text-4xl font-bold text-white mt-4 mb-3 leading-tight">{{ post.title }}</h1>
    <p class="text-sm text-zinc-500 mb-8">
      <time :datetime="post.date">{{ formatPostDate(post.date) }}</time> · {{ post.readingMinutes }} min read ·
      facts checked {{ formatPostDate(post.checked) }}
    </p>

    <div class="post-body text-zinc-300 leading-relaxed" v-html="post.html"></div>

    <section class="mt-10 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h2 class="text-lg font-semibold text-white mb-3">Sources</h2>
      <ul class="list-disc pl-5 space-y-1 text-sm text-zinc-400">
        <li v-for="source in post.sources" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">{{ source.label }}</a>
        </li>
      </ul>
    </section>

    <section class="mt-6 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <p class="text-white mb-3">
        TuneCraft is a free music library on top of YouTube: bring in your YouTube playlists, Shazam list, Takeout
        history or Last.fm / ListenBrainz scrobbles, tag songs your way, and get smart playlists that refill themselves from your plays.
      </p>
      <a
        href="/"
        class="inline-block px-5 py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
      >See how TuneCraft works</a>
    </section>

    <section v-if="otherPosts.length" class="mt-10">
      <h2 class="text-lg font-semibold text-white mb-3">More guides</h2>
      <ul class="space-y-2">
        <li v-for="other in otherPosts" :key="other.slug">
          <a :href="`/blog/${other.slug}`" class="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">{{ other.title }}</a>
        </li>
      </ul>
    </section>

    <p class="text-xs text-zinc-500 mt-10">
      <router-link to="/privacy" class="hover:text-zinc-300">Privacy</router-link>
      <span class="mx-2" aria-hidden="true">·</span>
      <router-link to="/terms" class="hover:text-zinc-300">Terms</router-link>
    </p>
  </article>

  <div v-else class="max-w-3xl mx-auto px-4 py-10 md:py-16">
    <h1 class="text-3xl font-bold text-white mb-4">Guide not found</h1>
    <a href="/blog" class="text-indigo-400 hover:text-indigo-300">See all guides</a>
  </div>
</template>

<style scoped>
/* Typography for the post body (static HTML from src/content/posts). */
.post-body :deep(h2) {
  color: #fff;
  font-size: 1.375rem;
  font-weight: 700;
  line-height: 1.3;
  margin: 2.25rem 0 0.75rem;
}
.post-body :deep(h3) {
  color: #fff;
  font-size: 1.125rem;
  font-weight: 600;
  margin: 1.5rem 0 0.5rem;
}
.post-body :deep(p) {
  margin: 0 0 1rem;
}
.post-body :deep(ul),
.post-body :deep(ol) {
  margin: 0 0 1rem;
  padding-left: 1.25rem;
}
.post-body :deep(ul) {
  list-style: disc;
}
.post-body :deep(ol) {
  list-style: decimal;
}
.post-body :deep(li) {
  margin: 0.25rem 0;
}
.post-body :deep(strong) {
  color: #fff;
}
.post-body :deep(a) {
  color: #818cf8; /* indigo-400 */
  text-decoration: underline;
  text-underline-offset: 2px;
}
.post-body :deep(a:hover) {
  color: #a5b4fc; /* indigo-300 */
}
.post-body :deep(blockquote) {
  margin: 0 0 1rem;
  padding: 1rem 1.25rem;
  border-left: 3px solid #4f46e5; /* indigo-600 */
  background: #18181b; /* zinc-900 */
  border-radius: 0.5rem;
}
.post-body :deep(blockquote p:last-child) {
  margin-bottom: 0;
}
.post-body :deep(code) {
  font-size: 0.875em;
  background: #27272a; /* zinc-800 */
  padding: 0.1rem 0.35rem;
  border-radius: 0.25rem;
  overflow-wrap: anywhere;
}
/* Wide tables scroll inside their own box on phones instead of widening the page. */
.post-body :deep(table) {
  display: block;
  overflow-x: auto;
  border-collapse: collapse;
  margin: 0 0 1.25rem;
  font-size: 0.875rem;
}
.post-body :deep(th),
.post-body :deep(td) {
  border: 1px solid #3f3f46; /* zinc-700 */
  padding: 0.5rem 0.75rem;
  text-align: left;
  vertical-align: top;
}
.post-body :deep(th) {
  color: #fff;
  background: #18181b; /* zinc-900 */
  font-weight: 600;
}
</style>
