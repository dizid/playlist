<script setup>
// Privacy policy (public page). Also the data-deletion instructions URL for
// Facebook Login (#delete-your-data) and the privacy URL for Google/X app settings.
const LAST_UPDATED = '3 November 2026'
const CONTACT_EMAIL = 'dev@dizid.com'
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-10 md:py-16">
    <router-link to="/" class="text-sm text-indigo-400 hover:text-indigo-300">&larr; TuneCraft</router-link>
    <h1 class="text-3xl font-bold text-white mt-4 mb-2">Privacy Policy</h1>
    <p class="text-sm text-zinc-450 mb-8">Last updated: {{ LAST_UPDATED }}</p>

    <div class="space-y-6 text-zinc-400 leading-relaxed">
      <section class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 class="text-lg font-semibold text-white mb-2">Who we are</h2>
        <p>
          TuneCraft (tunecraft.music) is run by Dizid Web Development. For questions or requests about your data,
          email <a :href="`mailto:${CONTACT_EMAIL}`" class="text-indigo-400 hover:text-indigo-300">{{ CONTACT_EMAIL }}</a>.
        </p>
      </section>

      <section class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 class="text-lg font-semibold text-white mb-2">What we collect</h2>
        <ul class="list-disc pl-5 space-y-2">
          <li>
            <span class="text-white">Your account:</span> when you sign in with Google, GitHub, Facebook or X, that
            service gives us your name, email address (if it shares one), profile picture and an account ID.
            We never see your password.
          </li>
          <li>
            <span class="text-white">Your music library:</span> the songs, tags, playlists, play counts and play history
            you import or create in TuneCraft.
          </li>
          <li>
            <span class="text-white">Connected services:</span> if you connect Last.fm or ListenBrainz, we store your
            username there and import the listening history that service shows publicly.
          </li>
          <li>
            <span class="text-white">YouTube:</span> only if you tap "Connect YouTube". Google then gives your browser
            read-only access for about one hour. That access stays in your browser, which uses it to read your
            playlists and liked videos and sends TuneCraft only the song details (title, artist, video ID).
            We never post, change or delete anything on YouTube.
          </li>
          <li>
            <span class="text-white">Notifications (optional):</span> an email address and browser push subscription,
            only if you turn on import notifications.
          </li>
        </ul>
      </section>

      <section class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 class="text-lg font-semibold text-white mb-2">How we use it</h2>
        <p class="mb-3">
          Only to run TuneCraft for you: building your library and smart playlists, syncing your plays and sending the
          notifications you asked for. We show no ads, sell no data and share nothing with advertisers or data brokers.
          TuneCraft uses no tracking or advertising cookies; your browser's storage only keeps you signed in and
          remembers your YouTube connection.
        </p>
        <p>
          TuneCraft's use and transfer of information received from Google APIs adheres to the
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener" class="text-indigo-400 hover:text-indigo-300">Google API Services User Data Policy</a>,
          including the Limited Use requirements. YouTube data is handled under the
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener" class="text-indigo-400 hover:text-indigo-300">Google Privacy Policy</a>.
        </p>
      </section>

      <section class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 class="text-lg font-semibold text-white mb-2">Services that process your data for us</h2>
        <ul class="list-disc pl-5 space-y-1">
          <li>Google Firebase: sign-in</li>
          <li>Netlify: website hosting and server functions</li>
          <li>Neon: database (servers in Singapore)</li>
          <li>Resend: notification emails</li>
          <li>Last.fm, ListenBrainz, YouTube and Cover Art Archive: song and listening data, when you use them</li>
        </ul>
      </section>

      <section id="delete-your-data" class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 scroll-mt-6">
        <h2 class="text-lg font-semibold text-white mb-2">Delete your data</h2>
        <ul class="list-disc pl-5 space-y-2">
          <li>
            <span class="text-white">Everything in TuneCraft:</span> go to Settings &rarr; Delete all data. This
            immediately removes your songs, playlists, play history, connected services and import history.
          </li>
          <li>
            <span class="text-white">Your account itself:</span> email
            <a :href="`mailto:${CONTACT_EMAIL}`" class="text-indigo-400 hover:text-indigo-300">{{ CONTACT_EMAIL }}</a>
            from the address you sign in with, and we delete your account and all its data within 30 days.
          </li>
          <li>
            <span class="text-white">Stop a connection:</span> disconnect Last.fm or ListenBrainz on the Import page,
            or remove TuneCraft's access in your
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener" class="text-indigo-400 hover:text-indigo-300">Google</a>,
            Facebook (Settings &rarr; Apps and websites), GitHub (Settings &rarr; Applications) or
            X (Settings &rarr; Security &rarr; Connected apps) account.
          </li>
        </ul>
      </section>

      <section class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 class="text-lg font-semibold text-white mb-2">How long we keep it</h2>
        <p>As long as you have a TuneCraft account, or until you delete it as described above.</p>
      </section>

      <section class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 class="text-lg font-semibold text-white mb-2">Changes</h2>
        <p>If this policy changes, we update this page and the date at the top.</p>
      </section>
    </div>
  </div>
</template>
