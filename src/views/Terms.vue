<script setup>
// Terms of service (public page). Also the terms URL for Google/X app settings.
const LAST_UPDATED = '3 November 2026'
const CONTACT_EMAIL = 'dev@dizid.com'
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-10 md:py-16">
    <router-link to="/" class="text-sm text-indigo-400 hover:text-indigo-300">&larr; TuneCraft</router-link>
    <h1 class="text-3xl font-bold text-white mt-4 mb-2">Terms of Service</h1>
    <p class="text-sm text-zinc-450 mb-8">Last updated: {{ LAST_UPDATED }}</p>

    <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-zinc-400 leading-relaxed">
      <ol class="list-decimal pl-5 space-y-3">
        <li>
          TuneCraft (tunecraft.music) is a personal tool to organise your music taste, run by Dizid Web Development.
          It is currently free.
        </li>
        <li>
          TuneCraft doesn't host or stream music. Playing a song opens it on YouTube. By using TuneCraft's YouTube
          features you also agree to the
          <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener" class="text-indigo-400 hover:text-indigo-300">YouTube Terms of Service</a>.
        </li>
        <li>
          You're responsible for the accounts you connect and for following the terms of those services
          (YouTube, Last.fm, ListenBrainz and others).
        </li>
        <li>
          Don't misuse TuneCraft: no attempts to reach other users' data, no automated scraping, no overloading the service.
        </li>
        <li>
          You can export your data at any time (Settings &rarr; Export) and delete it as described in the
          <router-link to="/privacy" class="text-indigo-400 hover:text-indigo-300">Privacy Policy</router-link>.
        </li>
        <li>
          TuneCraft is provided "as is", without warranties. We may change or stop the service, and we'll try to give
          notice first. To the extent the law allows, we aren't liable for losses from using TuneCraft.
        </li>
        <li>
          Questions: <a :href="`mailto:${CONTACT_EMAIL}`" class="text-indigo-400 hover:text-indigo-300">{{ CONTACT_EMAIL }}</a>.
        </li>
      </ol>
    </div>
  </div>
</template>
