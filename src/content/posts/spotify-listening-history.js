// Blog post (code-based, no database). Facts checked against the sources listed below.
export default {
  slug: 'spotify-listening-history',
  title: 'Spotify Listening History: See It, Download It, Keep It',
  description: 'Where Spotify shows what you played, what Recents and Talk to Spotify can tell you, the two data downloads compared, and how to keep a full history going forward.',
  date: '2026-11-13',
  checked: '2026-11-12',
  readingMinutes: 6,
  html: `
<p>Spotify keeps your listening history in three places, and each one shows a different slice of it: a short list in the app, a beta assistant you can ask, and a data download that can go back to the day you opened your account. This guide covers what each one shows, how to get your full history out, and how to keep a complete record from now on. Checked against Spotify's own help pages as of November 2026.</p>

<h2>In the app: Recents</h2>
<p>Spotify's help page calls this <strong>Recents</strong>: the music, podcasts and audiobooks you've listened to or saved.</p>
<ul>
<li><strong>Phone and tablet:</strong> tap <strong>Home</strong>, tap your avatar at the top, then <strong>Recents</strong>. A filter at the top, such as <strong>Music</strong>, narrows the list.</li>
<li><strong>Desktop app:</strong> click <strong>Play Queue</strong> at the bottom, then <strong>Recents</strong>. Spotify says this shows the last 50 songs you listened to.</li>
</ul>
<p>So Recents is a quick "what was that song?" list, not a full log. Spotify's page gives no time range for it.</p>

<h3>What a private session leaves out</h3>
<p>Listening in a <strong>Private Session</strong> doesn't show in Friend Activity, doesn't update the recently played artists on your profile, isn't used for your recommendations and doesn't count toward your Wrapped. It's an account setting, so switching it on from your phone covers your other devices too, and it switches itself off after 6 hours or when you restart the app. To start one on a phone: profile picture, <strong>Settings and privacy</strong>, <strong>Privacy and social</strong>, then <strong>Private Session</strong> under Listening activity. On desktop: profile picture, then <strong>Private session</strong>.</p>

<h2>Ask it: Talk to Spotify (beta)</h2>
<p>Spotify's voice and chat assistant, Talk to Spotify, is a beta feature for Premium listeners aged 18 and over. Its help page lists history questions such as "When did I first listen to this song?" and "How many times have I played this song?", and requests like "Play songs I listened to in 2024 but not 2025". The page doesn't say how far back it can look, and Spotify notes the beta may change. It answers questions; it doesn't give you a file.</p>

<h2>Download it: Account data or Extended streaming history</h2>
<p>For a copy you can keep, use the <strong>Download your data</strong> tool on your <strong>Account Privacy</strong> page. You get JSON files in a ZIP, and you can ask for the packages separately or together. The difference that matters is how far back the streaming history goes:</p>
<table>
<thead><tr><th></th><th>Account data</th><th>Extended streaming history</th></tr></thead>
<tbody>
<tr><td>How far back</td><td>Past year only</td><td>The whole life of your account</td></tr>
<tr><td>Per stream</td><td>When it ended (UTC), artist, track and how many milliseconds you listened</td><td>When it ended (UTC), track, artist, album and Spotify track link, plus platform, country, IP address, start and end reason, and shuffle, skip and offline flags</td></tr>
<tr><td>Also inside</td><td>Playlists, Your Library, searches, follows, payments, Wrapped data and more</td><td>Podcast episodes and shows; a "Read Me First" file explains every field</td></tr>
</tbody>
</table>
<p>If you want your history from before last year, ask for <strong>Extended streaming history</strong>; the Account data package alone won't have it. Treat the files like any personal document: the extended history includes the IP address and device details of every stream.</p>

<h2>Keep it going: connect a scrobbler</h2>
<p>None of the above keeps adding to a permanent record for you. A scrobbling service does. Last.fm and ListenBrainz both connect to Spotify and log every play from then on. Both read your plays through Spotify's API, which only shows your last 50 plays at a time, and Last.fm's FAQ adds that offline listening is limited to the last 50 tracks.</p>
<ul>
<li><strong>Last.fm:</strong> log in, open Settings, click Applications, then Connect next to Spotify Scrobbling.</li>
<li><strong>ListenBrainz:</strong> open Settings, then Connect services, and connect Spotify. ListenBrainz can also take your Extended streaming history ZIP under Settings, Import listens, with an optional start and end date so you don't import a period twice.</li>
</ul>
<p>Not sure which one? See <a href="/blog/lastfm-vs-listenbrainz">Last.fm vs ListenBrainz in 2026</a>. Moving apps as well? See <a href="/blog/spotify-youtube-music-transfer">what transfers between Spotify and YouTube Music</a>.</p>

<h2>What you can do with it</h2>
<ul>
<li><strong>Read it.</strong> The JSON files open in any text editor, and spreadsheet tools and scripts can count your most played artists per year.</li>
<li><strong>Back up your Wrapped years.</strong> Extended history is the raw data behind them, kept in your own files.</li>
<li><strong>Use it in a music library.</strong> TuneCraft, a free library on top of YouTube, doesn't read Spotify's ZIP directly. Connect your Last.fm or ListenBrainz account instead (TuneCraft syncs it every hour), and your Spotify plays become play counts, with smart playlists such as Top 50 built from them. Clicking Play opens the song on YouTube.</li>
</ul>
`,
  sources: [
    { label: 'Spotify Support: Recent activity (Recents, last 50 songs on desktop)', url: 'https://support.spotify.com/us/article/listening-history/' },
    { label: 'Spotify Support: Private listening (Private Session)', url: 'https://support.spotify.com/us/article/private-listening/' },
    { label: 'Spotify Support: Talk to Spotify (beta, Premium, 18+)', url: 'https://support.spotify.com/us/article/talk-to-spotify/' },
    { label: 'Spotify Support: Understanding your data (Account data vs Extended streaming history)', url: 'https://support.spotify.com/us/article/understanding-my-data/' },
    { label: 'Spotify Support: Data rights and privacy choices (Download your data)', url: 'https://support.spotify.com/us/article/data-rights-and-privacy-settings/' },
    { label: 'Last.fm Support FAQ: Spotify Scrobbling', url: 'https://support.last.fm/t/spotify-scrobbling/189' },
    { label: 'Spotify Community FAQ: How can I connect Spotify to Last.fm?', url: 'https://community.spotify.com/t5/FAQs/How-can-I-connect-Spotify-to-Last-fm/ta-p/4795301' },
    { label: 'ListenBrainz source: Import listens page (supported files, Spotify 50-listen limit)', url: 'https://github.com/metabrainz/listenbrainz-server/blob/master/frontend/js/src/settings/import/ImportListens.tsx' },
    { label: 'MetaBrainz Blog (30 Aug 2025): GSoC 2025, importing listening history files in ListenBrainz', url: 'https://blog.metabrainz.org/2025/08/30/gsoc-2025-importing-listening-history-files-in-listenbrainz/' },
  ],
}
