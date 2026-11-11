// Blog post (code-based, no database). Facts checked against the sources listed below.
export default {
  slug: 'youtube-music-listening-history-stats',
  title: 'Where YouTube Music Shows Your Listening History and Stats',
  description: 'Where YouTube Music shows what you played, how history settings and auto-delete work, what Recap covers, what is missing, and how to get fuller stats.',
  date: '2026-11-12',
  checked: '2026-11-12',
  readingMinutes: 5,
  html: `
<p>YouTube Music remembers what you play, but it spreads that memory over a few different places: a history list, an "On repeat" section on your channel, and a yearly Recap. This guide shows where each one lives, what controls whether your history is kept, and what you have to do to get fuller numbers. Everything below is as of November 2026, from Google's own help pages.</p>

<h2>The history list</h2>
<p>YouTube Music's help page for managing your history says to select your profile picture, then <strong>History</strong>. Next to a song or podcast you want to remove, select <strong>More</strong>, then <strong>Remove from history</strong>. A separate help page for watch history gives a second route in the app: profile picture, <strong>Settings</strong>, <strong>Privacy &amp; location</strong>, then <strong>Manage watch history</strong>, where you tap the remove icon next to an item.</p>
<p>YouTube Music's own pages do not split these steps by app and web, so if a menu looks different on your device, expect small wording changes between versions. One more detail from YouTube's overview of YouTube Music: it says Premium members can also view recently played songs, playlists and downloaded content in the Library tab.</p>
<p>On a computer you can also use Google's My Activity page. YouTube's help says to go to My Activity, click <strong>YouTube History</strong>, then <strong>Manage history</strong>. Clicking the close icon next to a video removes it. The page warns that using <strong>DELETE</strong> on your watch history also deletes your search history from the time frame you select.</p>

<h2>What is kept, and for how long</h2>
<p>History is controlled by your Google Account, not by YouTube Music alone. The help pages say:</p>
<ul>
<li><strong>It is shared with YouTube.</strong> Watch history settings are shared, so pausing watch history while signed in to YouTube also pauses it in YouTube Music for the same account.</li>
<li><strong>Pausing stops it counting.</strong> When paused, videos you watch "won't show in your watch history or be used to improve your recommendations." In the app: profile picture, Settings, Privacy &amp; location, then turn <strong>Pause watch history</strong> on or off. On a computer, open My Activity, then the <strong>Controls</strong> tab, and choose <strong>Turn off</strong>.</li>
<li><strong>Auto-delete is available.</strong> Google's account help lists YouTube History among the activity controls where you can pick <strong>Auto-delete</strong> and choose how long to keep activity. On a computer: My Activity, <strong>YouTube History</strong>, <strong>Manage history</strong>, <strong>Auto-delete</strong>, choose a time range, then <strong>Next</strong> and <strong>Confirm</strong>. Google's general My Activity page says activity can be deleted automatically once it is older than 3, 18 or 36 months. Some activity may expire sooner than the period you choose.</li>
</ul>
<p>The pages we read do not state how long history is kept if you change nothing, so we are not going to guess a number. Check the Auto-delete setting in My Activity to see what your account is set to.</p>

<h2>On repeat and your personal mix</h2>
<p>Your channel page has an "On repeat" section: open YouTube Music, select your profile icon, then <strong>Your Channel</strong>. It shows songs, artists, playlists and videos, plus your personal mix. Both are private unless you choose to share them, and they refresh daily. The help page says "On repeat" is based on your watch history across all YouTube services, so a music video you watch often on YouTube can affect it, and any change to your history is reflected in your stats.</p>

<h2>YouTube Music Recap</h2>
<p>Recap bundles your top songs, artists, podcasts and more into personalised playlists and stats. There are seasonal and yearly versions. Per the Recap help page:</p>
<ul>
<li>A seasonal Recap needs at least 4 hours of music listening across YouTube platforms in that season.</li>
<li>The end-of-year Recap needs at least 10 hours of music listening from January 1 to November 15, plus at least 5 songs with repeat listens.</li>
<li>Watch history that was paused during that period is not included. Auto-delete set to activity older than 3 months can prevent you from seeing a Recap.</li>
<li>You can save previous stats and playlists.</li>
</ul>
<p>To open it in the YouTube Music app on Android: tap your profile photo, choose <strong>Your Recap</strong>, then tap <strong>Get your Recap</strong>. In the YouTube app, open the You tab and look for the Recap banner, then tap <strong>Get your Music Recap</strong> on the last card. The help page also names youtube.com/musicrecap as a shortcut. The page does not give a release date for the end-of-year Recap, so we do not either.</p>

<h2>What YouTube Music does not show</h2>
<p>Across the help pages above, what you get is a list of recent plays you can edit, "On repeat" highlights, and Recap summaries. None of those pages describes a screen that lists every song with its total play count, or one that lets you export your listening statistics from the app itself. If you need that, you have to build it from an export or from scrobbles, covered next.</p>

<h2>Getting full stats</h2>
<ul>
<li><strong>Google Takeout.</strong> Google Takeout is Google's export tool. Our step-by-step guide is <a href="/blog/export-youtube-music-history-google-takeout">how to export your YouTube Music history with Google Takeout</a>.</li>
<li><strong>Scrobbling.</strong> Last.fm and ListenBrainz are scrobbling services that record your plays. Our comparison, including how they work with YouTube Music, is in <a href="/blog/lastfm-vs-listenbrainz">Last.fm vs ListenBrainz</a>.</li>
</ul>
<p>Keep the settings above in mind. Videos watched while watch history is paused do not show in your history, and auto-delete removes older activity, so check them before you rely on your history for stats.</p>

<h2>How TuneCraft uses this</h2>
<p>TuneCraft is a free companion app on top of YouTube and YouTube Music. You bring in your history from a Google Takeout export, Shazam, Last.fm or ListenBrainz, tag songs with your own genres and moods, and it builds rule-based smart playlists, Top 50, Heavy Rotation and Fresh Loves, from your own play counts (each Play in TuneCraft and every Last.fm or ListenBrainz scrobble counts). Clicking Play opens YouTube. It does not replace the history YouTube Music keeps, it just puts it to more use.</p>
`,
  sources: [
    { label: 'YouTube Music Help: Customize your music & podcasts (History, Remove from history, likes)', url: 'https://support.google.com/youtubemusic/answer/6313542?hl=en' },
    { label: 'YouTube Music Help: View, delete, or pause watch history', url: 'https://support.google.com/youtubemusic/answer/6364666?hl=en' },
    { label: 'YouTube Help: View, delete or pause watch history (My Activity, Auto-delete)', url: 'https://support.google.com/youtube/answer/95725?hl=en' },
    { label: 'YouTube Help: Find music & podcasts in YouTube Music', url: 'https://support.google.com/youtube/answer/13401025?hl=en' },
    { label: 'Google Account Help: How Google protects your privacy & keeps you in control (YouTube History, Auto-delete)', url: 'https://support.google.com/accounts/answer/10400210?hl=en' },
    { label: 'Google Account Help: Manage your Google data with My Activity (3, 18, 36 months)', url: 'https://support.google.com/accounts/answer/9784401?hl=en' },
    { label: 'Google Account Help: Delete your activity (auto-delete steps, activity may expire sooner)', url: 'https://support.google.com/accounts/answer/465?hl=en' },
    { label: 'YouTube Music Help: Manage your top stats or personal mix (On repeat)', url: 'https://support.google.com/youtubemusic/answer/13407991?hl=en' },
    { label: 'YouTube Music Help: View your YouTube Music Recap', url: 'https://support.google.com/youtubemusic/answer/11418178?hl=en' },
  ],
}
