// Blog post (code-based, no database). Facts checked against the sources listed below.
export default {
  slug: 'youtube-music-smart-playlists-mixes',
  title: 'YouTube Music Mixes and Playlists: What You Can and Cannot Set',
  description: 'The automatic mixes and playlists YouTube Music documents today, how likes and history shape them, what you can tune, and what rule-based playlists need.',
  date: '2026-11-12',
  checked: '2026-11-12',
  readingMinutes: 5,
  html: `
<p>YouTube Music builds several playlists for you without being asked. Some are documented on Google's help pages today, others were announced in old blog posts and are harder to confirm. This guide sticks to what the current help pages say, so it is shorter than many lists you will find online. Everything below is as of November 2026.</p>

<h2>What the help pages document today</h2>
<table>
<thead>
<tr><th>Playlist</th><th>What the help page says</th></tr>
</thead>
<tbody>
<tr><td>Liked Music</td><td>Songs you like go to a playlist called Liked Music, pinned at the top of your Library. Liked songs and albums also appear in your Library's Songs section.</td></tr>
<tr><td>Personal mix</td><td>Built from your recent top artists and songs and featured on your channel page. It updates daily and is private unless you make it public.</td></tr>
<tr><td>Custom mix</td><td>A mix you create yourself in the mobile app and can adjust later with Tune.</td></tr>
<tr><td>YouTube Mix</td><td>A nonstop playlist tailored to you. It can appear in search results, on Home, on Music cards and in the Suggested section of some watch pages, and you can save it to your Library.</td></tr>
<tr><td>New Episodes</td><td>All new episodes of podcast shows you follow appear in the New Episodes playlist in your library.</td></tr>
<tr><td>Ask Music mixes</td><td>Mixes and playlists generated from a request you type or speak. A Premium feature, mobile only, in select countries.</td></tr>
</tbody>
</table>

<h3>Personal mix</h3>
<p>Your personal mix lives on your channel page: open YouTube Music, select your profile icon, then <strong>Your Channel</strong>. The help page says it is built from your recent top artists and songs and refreshes daily. You can share it from profile picture, <strong>Settings</strong>, <strong>Privacy &amp; location</strong>, <strong>Channel settings</strong>, then turn on <strong>Share your personal mix</strong>.</p>

<h3>Custom mix</h3>
<p>This is the closest thing to a setting you control. In the mobile app go to <strong>Library</strong>, then <strong>New</strong>, then <strong>Mix</strong>, select artists and tap <strong>Next</strong>. You then get three settings:</p>
<ul>
<li><strong>Artist variety:</strong> how much variance there is between artists within the mix.</li>
<li><strong>Music discovery:</strong> how familiar you are with the artists added to the mix.</li>
<li><strong>Filters:</strong> extra features that may affect the mix, such as BPM, popularity and mood.</li>
</ul>
<p>Tap <strong>Done</strong> to create it. To change it later, tap <strong>Tune</strong> on the mix page.</p>

<h3>YouTube Mix</h3>
<p>YouTube's help describes a Mix as a "nonstop playlist tailored to you". To keep one, add it to your Library: on a computer, click the icon at the top right of the Mix; on mobile, tap <strong>Save</strong> below the description. The page does not explain how a Mix is built. Saving a Mix is not available if the content's audience is set as made for kids.</p>

<h3>Ask Music</h3>
<p>Ask Music is a generative AI feature that creates custom mixes and playlists from a request such as a mood or activity. Google says it is available to YouTube Premium and YouTube Music Premium members, on mobile only, in select countries, and that "Quality and accuracy may vary." Mixes it shows as search results can carry the label "Mix created by AI". Google says it may use your listening and watch history, such as top artists, songs and podcast shows, to answer a request.</p>

<h2>What about Supermix, Discover Mix and New Release Mix?</h2>
<p>You may know these names. YouTube's official blog described a Discover Mix of 50 tracks refreshed every week and a New Release Mix of recent releases from your favourite artists in December 2019. A November 2020 post said Supermix was the new name for Your Mix and blended all of a listener's tastes into one session. Those posts are years old, and we did not find these playlists in the current help pages, so we cannot confirm they still exist or work the same way. We also found no current help page for Replay Mix or an "Episodes for Later" playlist, and we leave them out.</p>

<h2>How likes and dislikes affect them</h2>
<p>The help page says you can like or dislike songs to customise your station, and that liked songs go to Liked Music and influence recommendations. It says your recommendations and search results can be based on content you have watched or liked and artists you subscribe to, and that you can change them by changing subscriptions, managing your watch history or removing liked songs, videos and podcasts. Unliking a song does not remove it from your Library, so do that separately with <strong>Remove from library</strong>.</p>
<p>On the Home tab, you can long-press a suggestion and select <strong>Not interested</strong>. YouTube's help says this does not affect your YouTube recommendations. Pausing watch history has an effect too: paused videos are not "used to improve your recommendations", and some personalised stations may not appear on Home.</p>
<p>The pages we read do not say how much weight a like or dislike carries in any particular mix, so there is no way to tune that.</p>

<h2>What you cannot do</h2>
<p>The custom mix controls above are about artists, familiarity and filters such as BPM, popularity and mood. None of the help pages we read describes a way to build a playlist from rules about your own history, for example "songs I liked more than 3 months ago and have not played in 30 days". If you need that, you need something outside YouTube Music that holds your history. Our guides on <a href="/blog/youtube-music-listening-history-stats">where YouTube Music shows your history</a> and <a href="/blog/export-youtube-music-history-google-takeout">exporting it with Google Takeout</a> cover where the data can come from.</p>

<h2>How TuneCraft approaches it</h2>
<p>TuneCraft is a companion app on top of YouTube and YouTube Music. You import your history from Google Takeout, Shazam, Last.fm or ListenBrainz and rate songs as loved, liked, neutral, disliked or blocked. It then builds rule-based smart playlists, such as Top 50, Fresh Loves and Heavy Rotation, from your own play counts and ratings. Clicking Play opens YouTube. It does not replace the mixes YouTube Music makes, and it only knows what you import into it.</p>
`,
  sources: [
    { label: 'YouTube Music Help: Customize your music & podcasts (likes, Liked Music, recommendations, New Episodes)', url: 'https://support.google.com/youtubemusic/answer/6313542?hl=en' },
    { label: 'YouTube Music Help: Listen to personal or custom mix', url: 'https://support.google.com/youtubemusic/answer/15165061?hl=en' },
    { label: 'YouTube Music Help: Manage your top stats or personal mix', url: 'https://support.google.com/youtubemusic/answer/13407991?hl=en' },
    { label: 'YouTube Help: YouTube Mix', url: 'https://support.google.com/youtube/answer/9011078?hl=en' },
    { label: 'YouTube Music Help: Ask Music for music and podcasts', url: 'https://support.google.com/youtubemusic/answer/17090260?hl=en' },
    { label: 'YouTube Help: Find music & podcasts in YouTube Music (Not interested)', url: 'https://support.google.com/youtube/answer/13401025?hl=en' },
    { label: 'YouTube Music Help: View, delete, or pause watch history', url: 'https://support.google.com/youtubemusic/answer/6364666?hl=en' },
    { label: 'YouTube Blog (Dec 2019): YouTube Music makes discovery more personal with playlists mixed for you', url: 'https://blog.youtube/news-and-events/youtube-music-makes-discovery-more/' },
    { label: 'YouTube Blog (Nov 2020): YouTube Music brings personalization to your everyday moods and moments', url: 'https://blog.youtube/news-and-events/youtube-music-brings-personalization-your-everyday-moods-and-moments/' },
  ],
}
