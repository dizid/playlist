<script setup>
// Shown for any URL that isn't a TuneCraft page (router catch-all). Netlify's SPA
// fallback answers those with the app shell (status 200), so the router marks this
// page noindex (src/router.js), which is Google's advice for SPA error pages.
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-16 md:py-24">
    <h1 class="text-3xl font-bold text-white mb-3">Page not found</h1>
    <p class="text-zinc-400 leading-relaxed mb-8">
      This page doesn't exist, or it has moved.
    </p>
    <router-link
      to="/"
      class="inline-flex items-center justify-center px-6 py-3 font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
    >
      Go to TuneCraft
    </router-link>
  </div>
</template>
