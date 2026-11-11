// Blog post (code-based, no database). Facts checked against the sources listed below.
export default {
  slug: 'lastfm-vs-listenbrainz',
  title: 'Last.fm vs ListenBrainz in 2026: Where to Keep Your Scrobbles',
  description: 'Last.fm vs ListenBrainz in November 2026: who runs them, Pro pricing, Spotify and YouTube Music setup, exports, privacy and open data, and which one to pick.',
  date: '2026-11-11',
  checked: '2026-11-11',
  readingMinutes: 6,
  html: `
<p>If you want a lasting record of what you listen to, two services do the job: Last.fm, the long-running scrobbling site, and ListenBrainz, the open-data alternative from the people behind MusicBrainz. Both are free to start, both work with Spotify, and neither has official YouTube Music support. The real differences are in who runs them, what you can get back out, and how public your data is. Everything below is as of November 2026.</p>

<h2>At a glance</h2>
<table>
<thead>
<tr><th></th><th>Last.fm</th><th>ListenBrainz</th></tr>
</thead>
<tbody>
<tr><td>Run by</td><td>Last.fm Limited, a company</td><td>MetaBrainz Foundation, a 501(c)(3) non-profit in California</td></tr>
<tr><td>Cost</td><td>Free with ads; Pro is $4.99 a month or $49.99 a year</td><td>Free; donations welcome</td></tr>
<tr><td>Spotify</td><td>Settings, Applications, Spotify Scrobbling, Connect</td><td>Settings, Connect services, Spotify</td></tr>
<tr><td>YouTube Music</td><td>No official support; Web Scrobbler extension or Android apps</td><td>No official support; Web Scrobbler extension or Android apps</td></tr>
<tr><td>Bring in old history</td><td>Hard: the scrobble API rejects timestamps that are too old</td><td>Connect your Last.fm account, or upload export files</td></tr>
<tr><td>Export</td><td>No export button; data is reachable through the public API</td><td>Settings, Export data: a ZIP of JSON files</td></tr>
<tr><td>Openness</td><td>API for non-commercial use</td><td>Listens public, released as CC0 open data</td></tr>
</tbody>
</table>

<h2>Who runs them, and how they pay for it</h2>
<p><strong>Last.fm</strong> is operated by Last.fm Limited, a commercial company. The free account shows ads: Last.fm's privacy policy says third-party ad providers use cookies to show interest-based ads. The paid tier, Last.fm Pro, removes ads on Last.fm and adds extras.</p>
<p><strong>ListenBrainz</strong> is a project of the MetaBrainz Foundation, which describes itself as a 501(c)(3) tax-exempt non-profit based in San Luis Obispo, California. It is funded by commercial supporters, donations and sponsors. In a 2024 blog post the team said it was not planning to paywall any features. Donating $5 gets you a cosmetic "donor flair" on your username for a month.</p>

<h2>What Last.fm Pro costs and adds</h2>
<p>When we checked last.fm/pro in November 2026, Pro was listed at $4.99 a month or $49.99 a year (the page showed dollar prices). Pro features include editing scrobbles to fix mistakes, changing your username, advanced and historical reports, ad-free browsing on Last.fm (not on embedded YouTube videos), and early access to new features. You don't need Pro to scrobble or to keep your history.</p>

<h2>Connecting Spotify</h2>
<p>Spotify removed scrobbling from its own apps years ago, so both services now read your plays through Spotify's API. That API has the same limit for both: it only shows your last 50 plays.</p>
<ul>
<li><strong>Last.fm:</strong> log in, open Settings, click Applications, then click Connect next to Spotify Scrobbling and allow access. Last.fm's FAQ notes that offline listening is limited to the last 50 tracks, and asks you to switch off other Spotify scrobblers so tracks aren't counted twice.</li>
<li><strong>ListenBrainz:</strong> open Settings, then Connect services, and connect Spotify. ListenBrainz can also fill in your older Spotify history: request your extended streaming history from Spotify's privacy page and upload the ZIP under Settings, Import listens.</li>
</ul>

<h2>YouTube and YouTube Music</h2>
<p>Neither service has an official YouTube Music connection. Last.fm's FAQ says web scrobbling isn't officially supported by YouTube and points to the Web Scrobbler browser extension, which exists for Chrome and other Chromium browsers, Firefox, and Safari on macOS and iOS. Web Scrobbler is also listed on ListenBrainz's "Submitting data" page.</p>
<p>For the YouTube and YouTube Music apps on Android, Last.fm recommends its own Android app or Pano Scrobbler. ListenBrainz lists Pano Scrobbler and its official Android app. On iOS, Last.fm says scrobbling the YouTube app isn't supported, so Web Scrobbler in Safari is the workaround.</p>
<p>ListenBrainz's page also lists community scripts that upload your YouTube Music watch history from a Google Takeout export. Our guide on <a href="/blog/export-youtube-music-history-google-takeout">exporting your YouTube Music history</a> shows how to get that file.</p>

<h2>Bringing in old history</h2>
<p>This is where the two differ most. Last.fm's scrobbling API returns "Timestamp was too old" for scrobbles that are too far in the past, which is why you can't simply upload years of old plays to Last.fm.</p>
<p>ListenBrainz is built to take history in. Under Settings, Connect services, you can enter your Last.fm username to import your entire Last.fm history and keep adding your new scrobbles automatically. Before you connect, ListenBrainz asks you to turn off "Hide recent listening information" in your Last.fm privacy settings. It also takes export files from Spotify, Libre.fm, Pano Scrobbler, Maloja, Rockbox (Audioscrobbler logs), Spinitron and ListenBrainz itself. ListenBrainz warns that sending the same plays from two sources, such as Last.fm and Spotify, can create duplicates.</p>

<h2>Getting your data out</h2>
<p><strong>Last.fm</strong> has no export button. Its support community points people to third-party tools that read your history through Last.fm's public API, which returns up to 200 scrobbles per page. Under its privacy policy you can also ask for a copy of your personal data by emailing dp3@last.fm with "Data Request" in the subject. Last.fm says it replies within one month, or up to three months for complex requests.</p>
<p><strong>ListenBrainz</strong> has Settings, Export data. You get a ZIP with your listening history as JSON (one listen per line), plus your loves and hates and your pinned recordings. You can limit it to a date range, you get an email when it's ready, and the file stays available for 30 days.</p>

<h2>Privacy and open data</h2>
<p>ListenBrainz is public by design. Its documentation describes it as a way to "publicly store a record" of the songs you listen to, and the site footer says user listen data is made public under the Creative Commons Zero (CC0) licence. MetaBrainz's GDPR statement says listens are made available to the public and included in data dumps anyone can download. Those dumps are published twice a month. MetaBrainz says it will never reveal your email address on its sites. If you don't want your listens processed, the only option is to delete your account.</p>
<p>Last.fm lets you hide your recent listening, but its business includes advertising, and its API is for non-commercial use only. Commercial use needs a separate agreement, and apps must credit and link to Last.fm.</p>

<h2>Reliability in 2026</h2>
<p>ListenBrainz has been open about growing pains. In August 2026 MetaBrainz wrote that statistics and weekly playlists were failing often, while listens were still being stored and imported, sometimes with delays. The causes it named include fast database growth and traffic surges from AI scrapers. On Last.fm, the main known issue is Spotify scrobbling sometimes stopping, and its FAQ has a troubleshooting guide for that.</p>

<h2>Which one should you pick?</h2>
<ul>
<li><strong>Pick Last.fm</strong> if you want its stats and reports and its long list of supported services: its Track My Music page lists Spotify, Tidal, Deezer, SoundCloud, Bandcamp, Pandora and more. The free tier is enough to keep your history.</li>
<li><strong>Pick ListenBrainz</strong> if you want a non-profit, open data, a real export button, and the ability to import years of old history from files.</li>
<li><strong>Use both</strong> if you can't decide: scrobble to Last.fm and connect your Last.fm account in ListenBrainz, so it keeps a copy automatically. Just don't also connect Spotify directly to ListenBrainz, or you may get duplicates.</li>
</ul>
<p>TuneCraft, a free music app on top of YouTube, works with either one. You connect a Last.fm or ListenBrainz username (no password), and it pulls your whole scrobble history and then syncs every hour. For Last.fm, the same rule as ListenBrainz applies: "Hide recent listening information" has to be off. Your plays then turn into a library you can rate, with smart playlists that update themselves. If you're also moving your Shazams over, see <a href="/blog/export-shazam-history">how to export your Shazam history</a>.</p>
`,
  sources: [
    { label: 'Last.fm Pro: prices and features', url: 'https://www.last.fm/pro' },
    { label: 'Last.fm: Track My Music (supported services)', url: 'https://www.last.fm/about/trackmymusic' },
    { label: 'Last.fm Privacy Policy', url: 'https://www.last.fm/legal/privacy' },
    { label: 'Last.fm API Terms of Service', url: 'https://www.last.fm/api/tos' },
    { label: 'Last.fm API: user.getRecentTracks', url: 'https://www.last.fm/api/show/user.getRecentTracks' },
    { label: 'Last.fm API: track.scrobble (ignored message codes)', url: 'https://www.last.fm/api/show/track.scrobble' },
    { label: 'Last.fm Support FAQ: Spotify Scrobbling', url: 'https://support.last.fm/t/spotify-scrobbling/189' },
    { label: 'Last.fm Support FAQ: Spotify has stopped scrobbling', url: 'https://support.last.fm/t/spotify-has-stopped-scrobbling-what-can-i-do/3184' },
    { label: 'Last.fm Support FAQ: YouTube and YouTube Music Scrobbling', url: 'https://support.last.fm/t/youtube-and-youtube-music-scrobbling/173' },
    { label: 'Last.fm Support Community: How do I get a copy of all my data?', url: 'https://support.last.fm/t/how-do-i-get-a-copy-of-all-my-data/116705' },
    { label: 'Spotify Community FAQ: How can I connect Spotify to Last.fm?', url: 'https://community.spotify.com/t5/FAQs/How-can-I-connect-Spotify-to-Last-fm/ta-p/4795301' },
    { label: 'ListenBrainz: Adding your data', url: 'https://listenbrainz.org/add-data/' },
    { label: 'ListenBrainz documentation: introduction', url: 'https://listenbrainz.readthedocs.io/en/latest/' },
    { label: 'ListenBrainz documentation: user history exports', url: 'https://listenbrainz.readthedocs.io/en/latest/users/api/export.html' },
    { label: 'ListenBrainz documentation: data dumps', url: 'https://listenbrainz.readthedocs.io/en/latest/users/listenbrainz-dumps.html' },
    { label: 'ListenBrainz source: Import listens page (supported files, Spotify 50-listen limit)', url: 'https://github.com/metabrainz/listenbrainz-server/blob/master/frontend/js/src/settings/import/ImportListens.tsx' },
    { label: 'ListenBrainz source: Last.fm connect panel in Connect services', url: 'https://github.com/metabrainz/listenbrainz-server/blob/master/frontend/js/src/settings/music-services/details/components/LFMMusicServicePermissions.tsx' },
    { label: 'ListenBrainz source: Settings menu (Connect services, Import listens, Export data)', url: 'https://github.com/metabrainz/listenbrainz-server/blob/master/frontend/js/src/settings/layout.tsx' },
    { label: 'ListenBrainz source: Export data page', url: 'https://github.com/metabrainz/listenbrainz-server/blob/master/frontend/js/src/settings/export/ExportButtons.tsx' },
    { label: 'MetaBrainz Foundation: About', url: 'https://metabrainz.org/about' },
    { label: 'MetaBrainz Foundation: GDPR compliance statement', url: 'https://metabrainz.org/gdpr' },
    { label: 'MetaBrainz Foundation: Privacy policy', url: 'https://metabrainz.org/privacy' },
    { label: 'MetaBrainz Blog: ListenBrainz donor flairs (2024)', url: 'https://blog.metabrainz.org/2024/12/16/listenbrainz-donor-flairs/' },
    { label: 'MetaBrainz Blog: Growing pains, an update on the ListenBrainz service status (Aug 2026)', url: 'https://blog.metabrainz.org/2026/08/19/growing-pains-an-update-on-the-listenbrainz-service-status/' },
  ],
}
