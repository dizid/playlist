// Blog post (code-based, no database). Facts checked against the sources listed below.
export default {
  slug: 'spotify-youtube-music-transfer',
  title: 'Spotify to YouTube Music (and Back): What Transfers in 2026',
  description: 'The built-in ways to move playlists between Spotify, YouTube Music and Apple Music, what each one leaves out, and how to keep your listening history.',
  date: '2026-11-12',
  checked: '2026-11-12',
  readingMinutes: 6,
  html: `
<p>Switching music apps used to mean a third-party tool. In 2026 both big apps have a built-in way in: YouTube Music can pull playlists from another service, and Spotify can do the same in the other direction. Google also has its own tool to copy YouTube Music playlists out to Apple Music. All three move playlists. None of them moves your listening history. This guide covers the exact steps, what each tool leaves behind, and how to keep the history too. Steps checked against each company's own help pages as of November 2026.</p>

<h2>Into YouTube Music: the built-in transfer</h2>
<p>YouTube Music's help page describes the transfer inside the YouTube Music app:</p>
<ol>
<li>Open the YouTube Music app and tap your profile picture.</li>
<li>Go to <strong>Settings</strong>, then <strong>Privacy &amp; data</strong>.</li>
<li>Tap <strong>Transfer playlists from other apps</strong>, then <strong>Let's start</strong>.</li>
<li>Sign in to your old music service and give access.</li>
<li>Pick the playlists you want and tap <strong>Transfer to YouTube Music</strong>.</li>
<li>Sign in to your Google Account when asked, to approve the transfer.</li>
</ol>
<p>Google says you can import playlists, albums, artists and tracks this way, and that the transfer keeps running in the background, so you can close the app. Larger libraries take longer. Things to know before you start:</p>
<ul>
<li><strong>It is a one-time copy.</strong> Your music stays on the old service, and later changes on either side don't sync.</li>
<li><strong>Some songs may not come across</strong>, because they aren't on YouTube Music.</li>
<li><strong>Podcasts can't be moved</strong> into or out of YouTube Music.</li>
<li><strong>Not every service has the built-in option.</strong> The help page says it depends on your previous service and doesn't list which ones. For the rest it points to two third-party tools, TuneMyMusic and Soundiiz, and adds that Google has no formal relationship with them and can't help with disputes.</li>
</ul>

<h2>Into Spotify: "Import your music"</h2>
<p>Spotify added its own import in November 2025, built with Tune My Music and rolled out on mobile worldwide. Spotify's help page gives these steps in the mobile app:</p>
<ol>
<li>Open <strong>Your Library</strong> and tap <strong>Import your music from other apps</strong> (Spotify's announcement says it sits at the bottom of Your Library).</li>
<li>Choose the service you're coming from and log in to it.</li>
<li>Tap <strong>Allow</strong> to give access.</li>
<li>Select the tracks or playlists and tap <strong>Transfer to Spotify</strong>.</li>
<li>Log in to Spotify to finish. The music shows up in Your Library.</li>
</ol>
<p>Spotify's page doesn't list the supported services, a size limit or whether you need Premium, and it sends import problems to Tune My Music's support, not Spotify's.</p>

<h2>Out of YouTube Music to Apple Music: Google's own copy</h2>
<p>Google can also copy your YouTube Music playlists out, through Google Takeout's transfer option (on your Google Account dashboard, find YouTube and choose <strong>Transfer data</strong>). The only service it copies to directly is Apple Music, and that needs an Apple Music subscription. The limits are strict:</p>
<ul>
<li><strong>Only playlists you created.</strong> Your Liked Music playlist, YouTube Music's own curated playlists, other people's playlists saved to your library and collaborative playlists you don't own are not copied.</li>
<li><strong>Only catalog music.</strong> Uploads, private content and podcasts stay behind.</li>
<li><strong>All or nothing.</strong> You can't pick single playlists; every playlist you created goes at once.</li>
<li><strong>It can't be undone.</strong> Cancelling in Takeout doesn't remove tracks already copied, and Google says to cancel the request in Apple's privacy portal too, or a later transfer may fail.</li>
<li><strong>Not for every account.</strong> Work and school accounts can't use it, and neither can accounts with Advanced Protection.</li>
</ul>
<p>Most transfers finish within minutes; large libraries can take hours. For any other destination, Google again points to Soundiiz and TuneMyMusic.</p>

<h2>What none of them moves: your listening history</h2>
<p>All of these tools move what you saved, not what you played. Play counts, your history and the years of listening behind your yearly recap stay with the old service. If that matters to you, get it out separately, ideally before you cancel anything.</p>
<ul>
<li><strong>From Spotify:</strong> use <strong>Download your data</strong> on your Account Privacy page. You get JSON files in a ZIP. The standard <strong>Account data</strong> package holds only the past year of streaming history (artist, track, when each stream ended and how long you listened). <strong>Extended streaming history</strong> covers your account's whole lifetime, with the end time of each stream, the track, artist and album, and the Spotify track link.</li>
<li><strong>From YouTube Music:</strong> your plays sit in your YouTube watch history, which Google Takeout exports. See <a href="/blog/export-youtube-music-history-google-takeout">how to export your YouTube Music history with Google Takeout</a>.</li>
<li><strong>Somewhere to keep it:</strong> ListenBrainz added a file importer in 2025 that takes Spotify's extended streaming history (and backups of old ListenBrainz accounts), with an optional start and end date so you can skip a period you already have. Last.fm and ListenBrainz both keep scrobbling once you connect them; see <a href="/blog/lastfm-vs-listenbrainz">Last.fm vs ListenBrainz in 2026</a>.</li>
</ul>

<h2>A short checklist for switching</h2>
<ol>
<li>Request Spotify's <strong>Extended streaming history</strong> (and a Takeout export, if you're leaving YouTube Music) while you still have the account.</li>
<li>Run the built-in transfer on the app you're moving to.</li>
<li>Look through the result for missing songs. Soundiiz, for example, tells you which tracks it couldn't match; the built-in transfers warn that some songs may not be available.</li>
<li>Check your liked songs separately. Google's outbound copy leaves Liked Music out, and the other help pages don't mention liked songs at all.</li>
<li>Remember nothing stays in sync: playlists you edit afterwards on the old app won't follow.</li>
</ol>

<h2>Where TuneCraft fits</h2>
<p>TuneCraft is a free music library on top of YouTube. It doesn't import from Spotify directly. Your Spotify plays reach it through a connected Last.fm or ListenBrainz account (TuneCraft syncs every hour), and your YouTube Music plays through a Takeout import, so the play counts from both apps end up in one place, with smart playlists such as Top 50 built from them. Clicking Play opens the song on YouTube.</p>
`,
  sources: [
    { label: 'YouTube Music Help: Transfer your playlists from another service', url: 'https://support.google.com/youtubemusic/answer/14729358?hl=en' },
    { label: 'Google Account Help: Copy your playlists to a service outside of YouTube Music', url: 'https://support.google.com/accounts/answer/14792019?hl=en' },
    { label: 'Spotify Support: Importing your playlists to Spotify', url: 'https://support.spotify.com/us/article/importing-your-playlists-to-spotify/' },
    { label: 'Spotify Newsroom (20 Nov 2025): 5 ways to get more out of your playlists (import via TuneMyMusic)', url: 'https://newsroom.spotify.com/2025-11-20/spotify-playlists-guide-transfer/' },
    { label: 'Spotify Support: Understanding your data (Account data vs Extended streaming history)', url: 'https://support.spotify.com/us/article/understanding-my-data/' },
    { label: 'Spotify Support: Data rights and privacy choices (Download your data)', url: 'https://support.spotify.com/us/article/data-rights-and-privacy-settings/' },
    { label: 'MetaBrainz Blog (30 Aug 2025): GSoC 2025, importing listening history files in ListenBrainz', url: 'https://blog.metabrainz.org/2025/08/30/gsoc-2025-importing-listening-history-files-in-listenbrainz/' },
  ],
}
