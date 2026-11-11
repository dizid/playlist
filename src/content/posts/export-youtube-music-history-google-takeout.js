// Blog post (code-based, no database). Facts checked against the sources listed below.
export default {
  slug: 'export-youtube-music-history-google-takeout',
  title: 'Export Your YouTube Music History with Google Takeout',
  description: 'Exact Google Takeout steps to export your YouTube and YouTube Music watch history, HTML vs JSON, what the file includes and misses, and what to do with it.',
  date: '2026-11-11',
  checked: '2026-11-11',
  readingMinutes: 6,
  html: `
<p>Google Takeout is the official way to download a copy of your YouTube watch history. Because YouTube Music uses the same history, the songs you played there come along in the same file. This guide covers the exact steps, the one format choice that matters, and what the file does and doesn't contain. Steps checked as of November 2026.</p>

<h2>First: there is no separate YouTube Music history</h2>
<p>Google's YouTube Music help is clear on this: watch history settings are shared between YouTube and YouTube Music, and if you pause history on YouTube, it is also paused on YouTube Music for the same account. So you don't export "YouTube Music history" on its own. Your music plays sit in the same YouTube watch history as your regular videos, and Takeout exports them together.</p>

<h2>Step by step: export your watch history</h2>
<p>Google recommends downloading and viewing Takeout exports on a desktop computer, not a phone. Then:</p>
<ol>
<li>Go to <a href="https://takeout.google.com">takeout.google.com</a> and sign in with the Google account you use for YouTube. Every Google product that holds your data is selected automatically.</li>
<li>Click <strong>Deselect all</strong>, scroll down, and tick <strong>YouTube and YouTube Music</strong>.</li>
<li>Click <strong>All YouTube data included</strong>. In that window click <strong>Deselect all</strong>, tick only <strong>history</strong>, and click <strong>OK</strong>. This keeps the export small: no uploaded videos, no comments, no other data.</li>
<li>Optional: click <strong>Multiple formats</strong> to see or change the file format for History (see the next section).</li>
<li>Click <strong>Next step</strong>.</li>
<li>Choose a delivery method: <strong>Send download link via email</strong>, or add the archive to Google Drive, Dropbox, Microsoft OneDrive or Box. An archive added to Drive counts toward your Google storage.</li>
<li>Choose the export type: a <strong>one-time archive</strong>, or <strong>scheduled exports</strong>, which Google creates every 2 months for one year.</li>
<li>Choose the file type. Google says .zip files open on almost any computer, while .tgz files may need extra software on Windows.</li>
<li>Choose the maximum archive size. If your data is bigger than that size, Google splits it into several archives. Picking the 50 GB limit lowers the chance of a split.</li>
<li>Click <strong>Create export</strong>.</li>
</ol>

<h2>HTML or JSON: the one choice that matters</h2>
<p>Takeout can give you your YouTube history as HTML or as JSON. Google's developer documentation for Takeout activity data lists both formats. You switch it under <strong>Multiple formats</strong>, in the dropdown next to History. Guides that walk through that screen tell you to change the History entry from HTML to JSON, so HTML is what you get if you leave it alone.</p>
<ul>
<li><strong>HTML</strong> (watch-history.html) is a web page. You can open it in any browser and scroll through it or search it. People who move their history into other tools have reported that the HTML file held their complete history while their JSON export came out cut short.</li>
<li><strong>JSON</strong> (watch-history.json) is easier for scripts. Each entry has the title, a timestamp, the link to the video and the channel name and link. Many open-source analysis scripts expect this format.</li>
</ul>
<p>If you plan to import the file into TuneCraft, keep HTML. TuneCraft's Takeout import only accepts watch-history.html (it reads the video links in the page) and does not take the JSON file. If you need both formats, you can simply run two exports.</p>

<h2>How long it takes, and how long the link lasts</h2>
<p>Google says making the archive can take anywhere from a few minutes to a few days, depending on how much data your account holds, and that most people get the link the same day they ask for it. You get an email when it's ready. Then keep these limits in mind:</p>
<ul>
<li>The archive expires in about 7 days. After that you have to create a new one.</li>
<li>Each archive can be downloaded 5 times. After that, you need to request another.</li>
<li>Changes you make after requesting the archive may not be in it.</li>
<li>Takeout can't export a chosen time period. You always get the whole history that is still stored.</li>
</ul>

<h2>Where the file is inside the ZIP</h2>
<p>Unzip the archive and open the folders Takeout, then YouTube and YouTube Music, then history. That's where watch-history.html (or watch-history.json) lives. Google also puts a file called archive_browser.html in every archive, which explains the file formats and how to open them.</p>

<h2>What the file contains</h2>
<ul>
<li>One entry for each video or song you started while signed in and with history on, with the date and time.</li>
<li>The title, a link to the video, and the channel. On an English-language account, titles start with the word "Watched". That word is translated on other languages, which can trip up scripts written for English.</li>
<li>YouTube Music plays, mixed in with regular videos. Many songs come from auto-generated artist channels, so the channel shows up as "Artist Name - Topic". Music scripts strip the " - Topic" part to get the artist.</li>
<li>In the JSON version, each entry also carries a product label, which some scripts use to skip plain YouTube entries and keep only the music.</li>
</ul>
<p>One thing to expect: the history records when you started something, not how long you listened. A user who imported their YouTube Music history into ListenBrainz reported that it included tracks played for only a few seconds, plus duplicates.</p>

<h2>What the file doesn't contain</h2>
<ul>
<li><strong>Anything played while history was off.</strong> YouTube's help says videos you watch while history is turned off won't show up in your history. Since the setting is shared, that includes YouTube Music.</li>
<li><strong>Anything you deleted.</strong> If you removed items, or set up auto-delete for your YouTube history, those plays are gone. Google adds that items still being deleted are not included in the archive.</li>
<li><strong>Plays on other accounts.</strong> Takeout exports one Google account. Anything you played while signed out, or while signed in to another account, is not in this file.</li>
<li><strong>Listening time.</strong> As noted above, you get start times, not durations.</li>
</ul>

<h2>Privacy notes</h2>
<ul>
<li>The file is a detailed log of what you watched and when. Treat it like any personal document, and delete the ZIP and the download email when you're done with them.</li>
<li>Downloading your data doesn't delete it from Google's servers. To delete history, use the history controls in My Activity or in YouTube, as described in YouTube's help.</li>
<li>On a work or school account, your Google Workspace administrator decides whether you can download data from each product.</li>
<li>Before you upload the file anywhere, check what that service keeps and whether you can delete it later. (In TuneCraft, Settings has a delete-all-data option.)</li>
</ul>

<h2>What you can do with your export</h2>
<ul>
<li><strong>Just read it.</strong> Open watch-history.html in a browser and search it for an artist or a song you half remember.</li>
<li><strong>Analyse it.</strong> The JSON version loads into scripts or a spreadsheet tool, so you can count your top channels or see how your listening changed over the years.</li>
<li><strong>Turn it into a scrobble history.</strong> ListenBrainz's "Submitting data" page lists community scripts (ytm-extractor and YTMusic2listenbrainz.py) that send your YouTube Music watch history to ListenBrainz. If you're choosing between scrobble services, see <a href="/blog/lastfm-vs-listenbrainz">Last.fm vs ListenBrainz in 2026</a>.</li>
<li><strong>Build a music library from it.</strong> TuneCraft is a free app that imports watch-history.html, tags genres and moods, lets you rate songs, and keeps smart playlists such as Top 50 and Heavy Rotation up to date. "Play" opens the song on YouTube.</li>
<li><strong>Keep a backup.</strong> Scheduled exports give you a fresh copy every 2 months for a year.</li>
</ul>
<p>Keep in mind that a Takeout file is a snapshot. If you want your listening tracked from now on, a scrobbler is the better tool: Last.fm's own help suggests the Web Scrobbler browser extension for YouTube and YouTube Music. Shazam users can get their list out too; see <a href="/blog/export-shazam-history">how to export your Shazam history</a>.</p>
`,
  sources: [
    { label: 'Google Account Help: How to download your Google data', url: 'https://support.google.com/accounts/answer/3024190?hl=en' },
    { label: 'YouTube Help: View, delete, or turn on or off watch history', url: 'https://support.google.com/youtube/answer/95725?hl=en' },
    { label: 'YouTube Music Help: View, delete, or pause watch history', url: 'https://support.google.com/youtubemusic/answer/6364666?hl=en' },
    { label: 'Google Data Portability API: My Activity schema reference (HTML and JSON formats)', url: 'https://developers.google.com/data-portability/schema-reference/my_activity' },
    { label: 'Making with Code (ISF Academy): Takeout steps incl. Multiple formats and History', url: 'https://the-isf-academy.github.io/making-with-code/cs9/unit01/project/data_collection/youtube' },
    { label: 'ytmusic_wrapped README: Takeout steps and " - Topic" artist names', url: 'https://github.com/cinfulsinamon/ytmusic_wrapped/blob/python3/README.md' },
    { label: 'Digital Takeout Day: How to export YouTube data (file paths and JSON fields)', url: 'https://takeoutday.org/guides/how-to-export-youtube-data' },
    { label: 'GitHub gist: YouTube Music watch history to ListenBrainz (HTML vs JSON reports, "Watched" prefix)', url: 'https://gist.github.com/fuddl/e17aa687df6ac1c7cbee5650ccfbc889' },
    { label: 'MetaBrainz Community: ytm-extractor, import YouTube Music listens to ListenBrainz', url: 'https://community.metabrainz.org/t/ytm-extractor-import-youtube-music-listens-to-listenbrainz/707619' },
    { label: 'ListenBrainz: Adding your data (community scripts for YouTube Music history)', url: 'https://listenbrainz.org/add-data/' },
    { label: 'Last.fm Support FAQ: YouTube and YouTube Music scrobbling', url: 'https://support.last.fm/t/youtube-and-youtube-music-scrobbling/173' },
  ],
}
