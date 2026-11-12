// Blog post (code-based, no database). Facts checked against the sources listed below.
export default {
  slug: 'export-youtube-music-playlists-liked-songs',
  title: 'Export YouTube Music Playlists and Liked Songs: What Works',
  description: 'How to export your YouTube Music playlists with Google Takeout, what the CSV files contain, what Google says about liked songs, and what is left out.',
  date: '2026-11-13',
  checked: '2026-11-12',
  readingMinutes: 5,
  html: `
<p>YouTube Music has no "export" button for playlists. Google gives you two official routes instead: Google Takeout, which downloads files, and a transfer tool that copies your playlists straight to Apple Music. This guide covers both, what the files contain, and what Google's own pages say about liked songs. Checked as of November 2026.</p>

<h2>Route 1: Google Takeout (files you keep)</h2>
<p>YouTube and YouTube Music share one Takeout product, so you tick the same box for both. On a desktop computer:</p>
<ol>
<li>Go to <a href="https://takeout.google.com">takeout.google.com</a> and sign in. Google selects the products you use automatically. Click <strong>Deselect all</strong> to start clean.</li>
<li>Scroll to <strong>YouTube and YouTube Music</strong> and tick it.</li>
<li>Click <strong>All YouTube data included</strong> to see the categories, and keep the playlists and music library ones. Everything else can stay off to keep the archive small.</li>
<li>Click <strong>Next step</strong>.</li>
<li>Choose a delivery method, an export type, a file type and an archive size, then create the export.</li>
</ol>
<p>Google's help page says Takeout can email you a download link, or add the archive to Google Drive, Dropbox, Microsoft OneDrive or Box. The export type is a one-time archive, or a scheduled export that runs every 2 months for one year. The file type is .zip or .tgz, and .tgz may need extra software on Windows. If your data is bigger than the archive size you pick, Google splits it into several archives, and it suggests the 50 GB limit to reduce splitting.</p>

<h2>How long it takes</h2>
<p>Google says an archive can take anywhere from a few minutes to a few days, and most people get it the same day. You get an email when it's ready. The archive expires in about 7 days, and each archive can be downloaded 5 times. After that you have to request a new one. Changes you make between asking for the export and its creation may be missing from it.</p>

<h2>What the playlist files contain</h2>
<p>Google's Takeout help page doesn't describe the files. Its Data Portability documentation, which lists the YouTube data Google lets you export, does: playlists are split by visibility into private, unlisted and public, and each group has two CSV files, one for the playlists and one for the videos in them. Google doesn't document the folder and file names inside a Takeout archive, so yours may be named differently.</p>
<table>
<thead><tr><th>File</th><th>What is in it</th></tr></thead>
<tbody>
<tr><td>Playlists (CSV)</td><td>Playlist ID, original title and description (plus any translations), creation and update timestamps, video order, visibility, the "add new videos to top" setting, and image details</td></tr>
<tr><td>Playlist videos (CSV)</td><td>Video ID, and the time the video was added to the playlist</td></tr>
</tbody>
</table>
<p>The important detail: the videos file holds IDs and timestamps, not song titles or artists. Google describes the Video ID as the ID that identifies the video in the playlist. If you open the file in a spreadsheet, you'll see IDs. To turn them into song names you need a tool that looks them up.</p>

<h2>Your music library: a separate file</h2>
<p>The same documentation lists a YouTube Music section with a CSV of <strong>music library songs</strong>, described as all songs added to your YouTube Music library. Its fields are song title, album title, artist name and duration. This is the one file in the export that has song names in plain text. The same section also covers music you uploaded yourself.</p>

<h2>Liked songs: what Google does not say</h2>
<p>Here Google's pages are thin. The Data Portability documentation lists playlists, the music library and uploads, but nothing in it mentions likes or a "Liked music" list. Google's playlist-copy page says only that Liked Music playlists in YouTube Music are not copied. So I can't tell you from Google's own pages that Takeout includes your liked songs, or what the file is called. If liked songs matter to you, run the export and look inside it before you delete anything. If they are missing, Takeout is not enough on its own.</p>

<h2>What is not included</h2>
<ul>
<li><strong>Anything deleted.</strong> Google says deleted data that is still being removed isn't in the archive.</li>
<li><strong>Later changes.</strong> See the note above about edits after you request the export.</li>
<li><strong>Your listening history.</strong> It is a different part of Takeout, and it is a separate file. See <a href="/blog/export-youtube-music-history-google-takeout">how to export your YouTube Music history with Google Takeout</a>.</li>
</ul>
<p>Downloading doesn't delete anything. Google says that if you download your data, it doesn't delete it from Google's servers.</p>

<h2>Route 2: copy playlists to Apple Music</h2>
<p>Google's other official route is a transfer from Takeout's YouTube Music transfer page, or from your Google Account dashboard under YouTube. It doesn't give you files. It copies playlists to another service, and the only one Google lists is Apple Music, which needs an Apple Music subscription. The limits:</p>
<ul>
<li>Only playlists you created are copied. YouTube Music curated playlists, Liked Music playlists, and collaborative playlists you don't own are not, and neither are playlists from other users that you saved.</li>
<li>Only catalog tracks transfer. Uploaded or private content and podcasts do not.</li>
<li>You can't choose single playlists. The page says it supports only the transfer of all your created playlists.</li>
<li>You can't reverse it. If you cancel partway, some items may already be copied, and you also need to cancel the request in Apple's privacy portal.</li>
<li>Work, school and organization accounts can't use it, and neither can accounts with Advanced Protection.</li>
</ul>
<p>Google says most transfers finish within minutes, and large libraries can take hours. Your original playlists stay in YouTube Music, and it is a one-time copy: later edits don't sync. For other destinations, see <a href="/blog/spotify-youtube-music-transfer">what transfers between Spotify and YouTube Music</a>.</p>

<h2>What to do with the files</h2>
<ul>
<li><strong>Keep the ZIP as a backup.</strong> It is plain CSV, so any spreadsheet opens it. Store it somewhere other than the download email, which expires.</li>
<li><strong>Keep the music library CSV first.</strong> It is the one with readable song and artist names.</li>
<li><strong>Don't expect an import to read the playlist CSVs.</strong> TuneCraft's Takeout import reads only watch-history.html, not the playlist files. For playlists and liked videos, TuneCraft's Import page can connect to your Google account with read-only access to your YouTube playlists and liked videos instead (it keeps the music and skips other videos), so you don't need these CSVs for that.</li>
</ul>
<p>TuneCraft is a free music library on top of YouTube. You keep your own play counts and your own genre and mood tags, and smart playlists such as Top 50 are built from the play counts. Clicking Play opens the song on YouTube.</p>
`,
  sources: [
    { label: 'Google Account Help: How to download your Google data (steps, delivery, schedule, size, timing, expiry)', url: 'https://support.google.com/accounts/answer/3024190?hl=en' },
    { label: 'Google Data Portability API: YouTube schema reference (playlists CSV, playlist videos CSV, music library songs)', url: 'https://developers.google.com/data-portability/schema-reference/youtube' },
    { label: 'Google Account Help: Copy your playlists to a service outside of YouTube Music', url: 'https://support.google.com/accounts/answer/14792019?hl=en' },
    { label: 'Digital Takeout Day: How to export YouTube data (YouTube and YouTube Music product, All YouTube data included)', url: 'https://takeoutday.org/guides/how-to-export-youtube-data' },
  ],
}
