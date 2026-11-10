// Build-time prerender (same pattern as TestSwap and ClientPilot). Runs last in `npm run build`, after
// the client build (dist/) and the SSR build of src/entry-server.js (dist-ssr/).
// It writes the real HTML of the public pages into dist/ (the landing page into
// dist/index.html, /privacy into dist/privacy.html, /terms into dist/terms.html), so
// crawlers that don't run JavaScript (GPTBot, ClaudeBot, PerplexityBot, link previews,
// and the Google/Facebook/X app checks that open the privacy and terms URLs) can read
// them. Netlify serves privacy.html for /privacy before the SPA fallback.
// In the browser, src/main.js hydrates that HTML.
//
// The untouched SPA shell is saved first as dist/app-shell.html; netlify.toml's SPA
// fallback serves it for every other route (/dashboard, /library, ...), so those never
// flash the landing page. The shell drops the homepage canonical, which would otherwise
// mark those pages as duplicates of the homepage.

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = join(root, 'dist')
const { render } = await import(pathToFileURL(join(root, 'dist-ssr', 'entry-server.js')).href)

const SITE_URL = 'https://tunecraft.music'
const APP_DIV = '<div id="app"></div>'
const CANONICAL_TAG = /<link\s+rel="canonical"[^>]*>\s*/i

// Public pages to prerender. `head` replaces the landing page's title, description,
// canonical and share tags (keep the titles in sync with routeTitles in src/router.js).
const PAGES = [
  { path: '/', file: 'index.html' },
  {
    path: '/privacy',
    file: 'privacy.html',
    head: {
      title: 'Privacy Policy | TuneCraft',
      description: 'What TuneCraft collects when you sign in with Google, GitHub, Facebook or X, how it is used, which services process it, and how to delete your account and data.',
    },
  },
  {
    path: '/terms',
    file: 'terms.html',
    head: {
      title: 'Terms of Service | TuneCraft',
      description: "The terms for using TuneCraft: a free tool that doesn't host music, your connected accounts, fair use, exporting your data, and how to contact us.",
    },
  },
]

const template = await readFile(join(distDir, 'index.html'), 'utf8')
if (!template.includes(APP_DIV)) {
  throw new Error(`prerender: ${APP_DIV} not found in dist/index.html`)
}

/** Escape text for an HTML attribute or element body. */
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Replace the value between the two groups of `tagPattern`; throws if the tag is missing. */
function setTagValue(html, tagPattern, value, label) {
  if (!tagPattern.test(html)) throw new Error(`prerender: ${label} not found in dist/index.html`)
  return html.replace(tagPattern, (_match, before, after) => `${before}${escapeHtml(value)}${after}`)
}

/** The landing page's <head>, rewritten for another public page. */
function headFor(html, path, { title, description }) {
  const url = `${SITE_URL}${path}`
  let page = setTagValue(html, /(<title>)[^<]*(<\/title>)/, title, 'title')
  page = setTagValue(page, /(<meta name="description" content=")[^"]*(")/, description, 'meta description')
  page = setTagValue(page, /(<meta property="og:url" content=")[^"]*(")/, url, 'og:url')
  page = setTagValue(page, /(<meta property="og:title" content=")[^"]*(")/, title, 'og:title')
  page = setTagValue(page, /(<meta property="og:description" content=")[^"]*(")/, description, 'og:description')
  page = setTagValue(page, /(<meta name="twitter:title" content=")[^"]*(")/, title, 'twitter:title')
  page = setTagValue(page, /(<meta name="twitter:description" content=")[^"]*(")/, description, 'twitter:description')
  page = setTagValue(page, /(<link rel="canonical" href=")[^"]*(")/, url, 'canonical')
  return page
}

// 1. The plain app shell for all other routes
await writeFile(join(distDir, 'app-shell.html'), template.replace(CANONICAL_TAG, ''))

// 2. The public pages, rendered. data-ssg-route tells src/main.js it may hydrate.
for (const { path, file, head } of PAGES) {
  const appHtml = await render(path)
  if (!appHtml.includes('<h1')) {
    throw new Error(`prerender: ${path} rendered without an <h1>; refusing to ship it`)
  }
  const pageTemplate = head ? headFor(template, path, head) : template
  const page = pageTemplate.replace(APP_DIV, () => `<div id="app" data-ssg-route="${path}">${appHtml}</div>`)
  await writeFile(join(distDir, file), page)
  console.log(`prerender: ${path} -> ${file} (${Math.round(appHtml.length / 1024)} KB of HTML)`)
}

console.log('prerender: app-shell.html for other routes')
