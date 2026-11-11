// Blog post (code-based, no database). Facts checked against the sources listed below.
export default {
  slug: 'export-shazam-history',
  title: 'How to Export Your Shazam History (What Works in 2026)',
  description: 'The old My Shazam CSV download is gone. What still works in November 2026: the official data request, My Shazam Tracks playlists, and your Shazam Library.',
  date: '2026-11-11',
  checked: '2026-11-11',
  readingMinutes: 5,
  html: `
<p>Shazam keeps every song you identify, but the way to get that list out has changed. The route most guides still describe (sign in at shazam.com/myshazam on a computer and click a CSV download) no longer works. Here is what does work as of November 2026, using only official Apple and Shazam options.</p>

<h2>The short answer</h2>
<ul>
<li><strong>A full copy of your Shazam data:</strong> request it at shazam.com/privacy under "Download your data". Apple says it arrives by email within 30 days.</li>
<li><strong>A list that keeps itself up to date:</strong> sync your Shazams to a "My Shazam Tracks" playlist in Apple Music or Spotify.</li>
<li><strong>Just looking up a song:</strong> open the Library in the Shazam app, or on iPhone, the Recognize Music history in Control Center.</li>
</ul>

<h2>What happened to shazam.com/myshazam?</h2>
<p>For years, shazam.com/myshazam was a web page where you could sign in, see your Shazams and download them as a CSV file. Apple's own help article for Shazam on Android (published March 2024) still tells you to sign in there on a Mac or PC to see your previous Shazams.</p>
<p>When we checked on 11 November 2026, that address permanently redirected to Shazam's app download page. There was no sign-in and no library on the site, and Apple's current Shazam help pages don't describe a web library or a CSV download. If a guide tells you to click "Download CSV" on My Shazam, it is out of date.</p>

<h2>Option 1: Request your Shazam data (the full export)</h2>
<p>This is the official way to get everything Shazam stores about you, including your history.</p>
<ol>
<li>Go to <a href="https://www.shazam.com/privacy">shazam.com/privacy</a> and choose <strong>Download your data</strong>.</li>
<li>Sign in with the account your Shazam app uses. The page offers <strong>Sign in with Apple</strong>, <strong>Sign in with Google</strong>, or email.</li>
<li>Enter the email address where the data should go.</li>
<li>Wait for the email. Apple's help says you'll receive your data within 30 days.</li>
</ol>
<p>Apple's help pages don't describe the file format or which columns you'll get, so check the files when they arrive. You're looking for a list of songs with a title and an artist for each one.</p>
<p>One thing to watch: Shazam on iPhone and iPad uses your Apple Account, while on Android you create a Shazam account with a Google account or an email address. If you've used both kinds of phone, or switched sign-in methods, your history may be spread over more than one account. Request a copy for each account you used.</p>

<h2>What about Apple's Data &amp; Privacy page?</h2>
<p>Apple also lets you request a copy of your Apple Account data at <a href="https://privacy.apple.com">privacy.apple.com</a>: sign in, choose "Request a copy of your data", pick the categories you want, and continue. Apple's help article lists categories such as Apple Account details, iCloud data, app usage information, and App Store, iTunes Store and Apple Books records. Shazam isn't named among them, so don't count on finding your Shazam history there. Use the Shazam request above for that. If you do request Apple data, note that you have 14 days to download it once it's ready.</p>

<h2>Option 2: Sync to a "My Shazam Tracks" playlist</h2>
<p>This one is real and official. Shazam can add the songs you identify to a playlist called My Shazam Tracks, in Apple Music or in Spotify.</p>
<h3>Apple Music</h3>
<ul>
<li><strong>iPhone or iPad:</strong> open Shazam's settings and turn on <strong>Sync your songs to Apple Music</strong>. Shazam creates My Shazam Tracks in the Music app.</li>
<li><strong>Android:</strong> go to your Library, open settings, and under <strong>Music app preference</strong> turn on <strong>Sync Shazam Library to Apple Music</strong>.</li>
<li>You need an Apple Music subscription for this.</li>
</ul>
<h3>Spotify</h3>
<ul>
<li><strong>iPhone or iPad:</strong> in Shazam's settings, tap <strong>Connect</strong> next to Spotify, agree in Spotify, then tap OK to turn on the playlist.</li>
<li><strong>Android:</strong> use the same Library settings and choose <strong>Sync Shazam Library to Spotify</strong>.</li>
<li>You need the Spotify app on your device.</li>
</ul>
<p>Apple's help doesn't say whether songs you identified before turning on sync get added. After you switch it on, compare the playlist with your Library. Once your songs are in a playlist, they're easier to share or move with playlist tools.</p>

<h2>Option 3: Your Library and Control Center history</h2>
<p>For a handful of songs, the app itself is enough.</p>
<ul>
<li><strong>iPhone or iPad:</strong> open Shazam and tap <strong>Library</strong> at the bottom of the screen.</li>
<li><strong>Android:</strong> open Shazam, go to <strong>Library</strong>, then tap <strong>Songs</strong>.</li>
<li><strong>Control Center (iPhone or iPad):</strong> touch and hold the Recognize Music button, then tap <strong>History</strong>. If the Shazam app is installed, this opens your Shazam Library.</li>
</ul>
<p>You can share a song from the Library through its More button, then Share. Apple's guide describes this for one song at a time, so it's fine for a few tracks and tedious for hundreds.</p>
<p>To keep songs from Control Center, Siri, the Apple Watch Smart Stack and Shortcuts in your Shazam Library, Apple says to use the same Apple Account on every device, turn on two-factor authentication, turn on Music Recognition and Shazam in your iCloud settings, and keep iCloud Sync on in Shazam's settings. According to Apple, this doesn't use any of your iCloud storage.</p>

<h2>Which route should you pick?</h2>
<table>
<thead>
<tr><th>You want</th><th>Use</th><th>Catch</th></tr>
</thead>
<tbody>
<tr><td>Everything, as a file</td><td>Download your data at shazam.com/privacy</td><td>Up to 30 days; file contents not documented</td></tr>
<tr><td>A list that keeps growing</td><td>My Shazam Tracks in Apple Music or Spotify</td><td>Needs Apple Music or the Spotify app</td></tr>
<tr><td>One or two songs</td><td>Library, then Share</td><td>One song at a time</td></tr>
</tbody>
</table>

<h2>Getting your Shazam list into TuneCraft</h2>
<p>TuneCraft is a free music app on top of YouTube. Its Shazam import reads a CSV file that has a column for the song title (headed title, track or name) and a column for the artist. It skips any info lines above that header row. That gives you three ways in:</p>
<ul>
<li>If your Shazam data download includes a CSV with title and artist columns, upload that file.</li>
<li>If you kept a CSV from the old My Shazam page, it still works.</li>
<li>For a short list, make your own: a spreadsheet with a Title column and an Artist column, saved as CSV.</li>
</ul>
<p>After the import you can tag each song with a genre and a mood and filter by them in Discover, and smart playlists such as Top 50 fill up from your play counts. "Play" opens the song on YouTube. If you also listen on YouTube Music, you can add that history too: see <a href="/blog/export-youtube-music-history-google-takeout">how to export your YouTube Music history with Google Takeout</a>.</p>

<h2>Keep a copy from now on</h2>
<p>Since there is no longer a download button you can press any time, the easiest habit is to turn on My Shazam Tracks now. Then your new Shazams land in a playlist you control, and a data request at shazam.com/privacy covers the full history whenever you need it.</p>
`,
  sources: [
    { label: 'Shazam: old My Shazam web address (redirects to shazam.com/apps, checked 11 Nov 2026)', url: 'https://www.shazam.com/myshazam' },
    { label: 'Shazam & Privacy: download or delete your data', url: 'https://www.shazam.com/privacy' },
    { label: 'Shazam: Download your data sign-in page', url: 'https://www.shazam.com/privacy/login/download' },
    { label: 'Apple Support: Use Shazam on Android devices', url: 'https://support.apple.com/en-us/118557' },
    { label: 'Apple Support: Use the Shazam app with Apple Music, Spotify, and more', url: 'https://support.apple.com/en-us/108933' },
    { label: 'Shazam User Guide: Where are my identified songs saved?', url: 'https://support.apple.com/guide/shazam/where-are-my-identified-songs-saved-dev64d8cd51e/web' },
    { label: 'Shazam User Guide: Sync your identified songs to the Shazam app', url: 'https://support.apple.com/guide/shazam/sync-your-identified-songs-to-the-shazam-app-deva59a13320/web' },
    { label: 'Shazam User Guide: Share your songs', url: 'https://support.apple.com/guide/shazam/share-your-songs-deva91f77c6a/web' },
    { label: 'Apple Support: Use your Apple device to identify what song is playing', url: 'https://support.apple.com/en-us/118570' },
    { label: 'Apple Support: Get a copy of the data associated with your Apple Account', url: 'https://support.apple.com/en-us/102208' },
  ],
}
