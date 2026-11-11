// Blog post (code-based, no database). Facts checked against the sources listed below.
export default {
  slug: 'apple-music-listening-history',
  title: 'Apple Music Listening History: Replay, Data Copy, Scrobbling',
  description: 'Where Apple Music shows what you played (Replay), the setting that has to be on, how to get a copy of your data from Apple, and how to keep a history of your own.',
  date: '2026-11-14',
  checked: '2026-11-12',
  readingMinutes: 5,
  html: `
<p>Apple Music doesn't have a simple "everything I've ever played" page. What it has is Replay, a set of yearly and monthly stats built from your listening history, plus Apple's privacy page, where you can ask for a copy of the data Apple keeps. This guide covers both, the setting that has to be on for any of it to work, and how to keep a play history of your own. Checked against Apple's support and privacy pages as of November 2026.</p>

<h2>First: the "Use Listening History" setting</h2>
<p>Replay is built from your listening history, and Apple's help page says that if you don't see Replay, <strong>Use Listening History</strong> has to be on for all of your devices:</p>
<ul>
<li><strong>iPhone or iPad:</strong> Settings, Apps, Music.</li>
<li><strong>Mac:</strong> in the Music app, Music, Settings, then the General tab.</li>
<li><strong>Android:</strong> in the Apple Music app, the More button, then Settings.</li>
</ul>

<h2>Replay: your top music</h2>
<p>Replay ranks your top songs, albums, artists, playlists, genres and stations from your Apple Music listening history, play counts and time spent listening.</p>
<ul>
<li><strong>Where:</strong> in the Music app on iPhone, iPad or Android, open <strong>Home</strong>, scroll to <strong>Replay: Your Top Music</strong> and tap <strong>Go back in time</strong>. On any device, including a Mac or PC, you can also go to replay.music.apple.com, sign in with the Apple Account you use for Apple Music, and choose <strong>Jump In</strong>.</li>
<li><strong>Monthly:</strong> once you're eligible, you see your top songs, artists and albums for each month, by play count and listening time. Apple sends a notification once you've played enough music; it doesn't say how much that is.</li>
<li><strong>Yearly:</strong> at the end of the calendar year you get the full Replay, with play counts, totals and listening time, a highlight reel, and comparisons you can share.</li>
<li><strong>Playlists:</strong> this year's Replay playlist (your top songs, updated weekly), an <strong>All Time</strong> playlist of your most-played songs, and the Replay playlists of past years. Add them to your library to keep them.</li>
<li><strong>Top listener:</strong> Replay tells you if you're among the top 100, 500 or 1,000 listeners of an artist or genre.</li>
</ul>
<p>Replay shows rankings and totals, not a dated list of every play.</p>

<h2>Get a copy of your data from Apple</h2>
<p>For the data itself, Apple's privacy page has a download:</p>
<ol>
<li>Sign in at privacy.apple.com with your Apple Account.</li>
<li>Choose <strong>Request a copy of your data</strong>.</li>
<li>Pick the data you want and choose <strong>Continue</strong>. App usage information for Apple Music is one of the categories. If you don't see the option, Apple says it isn't available in your country or region.</li>
</ol>
<p>Apple first checks that the request really comes from you, then prepares the files and lets you know when they're on your Data &amp; Privacy page. You then have 14 days to download them. App usage data comes as spreadsheets or JSON, CSV or PDF files, and Apple publishes file guides that explain them. Apple recommends a Mac or PC for downloading and opening the files, and you can't ask for the same data type again until the current request is done.</p>
<p>Timing matters if you're leaving: Apple's Apple Music privacy page says your listening activity, library and playlists are kept while your subscription is active and for up to two years after you cancel. Ask for your copy before then.</p>

<h2>Moving your playlists to YouTube Music</h2>
<p>The same privacy page can also <strong>Transfer a copy of your data</strong> to YouTube Music. Only playlists you created move (including collaborative playlists you own); curated playlists, shared playlists you don't own, playlist folders and the music files themselves don't. You need an active Apple Music or iTunes Match subscription and a YouTube Music account, and it isn't available for child accounts or Managed Apple Accounts. Apple says it usually takes a few minutes and can take several hours, and later edits don't sync. For other directions, see <a href="/blog/spotify-youtube-music-transfer">what transfers between Spotify and YouTube Music</a>.</p>

<h2>Keep your own history: scrobbling</h2>
<p>Neither Replay nor the data copy keeps a running log for you. A scrobbling service like Last.fm does. For Apple Music, Last.fm's own overview of ways to track your music says its iPhone app can scan and submit scrobbles manually, which works with Apple Music, and its desktop app on a Mac logs what you play in iTunes. If you're choosing a service, see <a href="/blog/lastfm-vs-listenbrainz">Last.fm vs ListenBrainz in 2026</a>.</p>

<h2>Where TuneCraft fits</h2>
<p>TuneCraft is a free music library on top of YouTube. It doesn't read Apple's data files, but it works with the two routes above: connect your Last.fm account and TuneCraft syncs your scrobbles every hour as play counts, and playlists you've moved to YouTube Music can be imported as YouTube playlists. Smart playlists such as Top 50 then fill up from those plays, and Play opens each song on YouTube.</p>
`,
  sources: [
    { label: 'Apple Support: How to get your Apple Music Replay', url: 'https://support.apple.com/en-us/109356' },
    { label: 'Apple Support: Get a copy of the data associated with your Apple Account', url: 'https://support.apple.com/en-us/102208' },
    { label: 'Apple Support: Understand and control the personal information that you store with Apple', url: 'https://support.apple.com/en-us/102283' },
    { label: 'Apple Support: Transfer a copy of your Apple Music playlists to another service', url: 'https://support.apple.com/en-us/120030' },
    { label: 'Apple Legal: Apple Music and Privacy (what is kept and for how long)', url: 'https://www.apple.com/legal/privacy/data/en/apple-music/' },
    { label: 'Last.fm: Track My Music (ways to scrobble)', url: 'https://www.last.fm/about/trackmymusic' },
  ],
}
