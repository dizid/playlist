// Build-time prerender (same pattern as TestSwap and ClientPilot). Runs last in `npm run build`, after
// the client build (dist/) and the SSR build of src/entry-server.ts (dist-ssr/).
// It writes the real landing-page HTML into dist/index.html, so crawlers that don't
// run JavaScript (GPTBot, ClaudeBot, PerplexityBot, link previews) can read it.
// In the browser, src/main.ts hydrates that HTML.
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

const APP_DIV = '<div id="app"></div>'
const CANONICAL_TAG = /<link\s+rel="canonical"[^>]*>\s*/i

const template = await readFile(join(distDir, 'index.html'), 'utf8')
if (!template.includes(APP_DIV)) {
  throw new Error(`prerender: ${APP_DIV} not found in dist/index.html`)
}

// 1. The plain app shell for all other routes
await writeFile(join(distDir, 'app-shell.html'), template.replace(CANONICAL_TAG, ''))

// 2. The landing page, rendered. data-ssg-route tells src/main.ts it may hydrate.
const appHtml = await render('/')
if (!appHtml.includes('<h1')) {
  throw new Error('prerender: the rendered landing page has no <h1>; refusing to ship it')
}
const page = template.replace(APP_DIV, () => `<div id="app" data-ssg-route="/">${appHtml}</div>`)
await writeFile(join(distDir, 'index.html'), page)

console.log(`prerender: / (${Math.round(appHtml.length / 1024)} KB of HTML), app-shell.html for other routes`)
