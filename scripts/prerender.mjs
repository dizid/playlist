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

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = join(root, 'dist')
const { render, BLOG_POSTS } = await import(pathToFileURL(join(root, 'dist-ssr', 'entry-server.js')).href)

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

// Guides blog (posts live in src/content/posts, no database): the index plus one page per
// post, each with BlogPosting JSON-LD. checkBlogPost() stops the build on a post that breaks
// the content rules, and every post must be listed in public/sitemap.xml and public/llms.txt.
const ALLOWED_POST_TAGS = new Set(['h2', 'h3', 'p', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'blockquote', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td'])

/** Throws if a blog post breaks the content rules (tags, lengths, links, sources, dates). */
function checkBlogPost(post) {
  const where = `blog post "${post.slug}"`
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(post.slug)) throw new Error(`prerender: ${where}: bad slug`)
  if (!post.title || post.title.length > 65) throw new Error(`prerender: ${where}: title missing or over 65 characters`)
  if (!post.description || post.description.length < 120 || post.description.length > 170) {
    throw new Error(`prerender: ${where}: description is ${post.description?.length} characters (want 120-170)`)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date) || !/^\d{4}-\d{2}-\d{2}$/.test(post.checked)) {
    throw new Error(`prerender: ${where}: date and checked must be YYYY-MM-DD`)
  }
  if (!Number.isInteger(post.readingMinutes) || post.readingMinutes < 1) {
    throw new Error(`prerender: ${where}: readingMinutes must be a whole number`)
  }
  for (const [, tag] of post.html.matchAll(/<\/?([a-zA-Z0-9]+)/g)) {
    if (!ALLOWED_POST_TAGS.has(tag.toLowerCase())) throw new Error(`prerender: ${where}: tag <${tag}> is not allowed`)
  }
  if (/\s(style|class|on[a-z]+)\s*=/i.test(post.html)) throw new Error(`prerender: ${where}: no style, class or event attributes`)
  for (const [, href] of post.html.matchAll(/<a\s[^>]*href="([^"]*)"/g)) {
    if (!href.startsWith('https://') && !/^\/blog\/[a-z0-9-]+$/.test(href) && href !== '/') {
      throw new Error(`prerender: ${where}: link "${href}" must be https:// or an internal /blog/<slug> link`)
    }
    const internal = href.match(/^\/blog\/([a-z0-9-]+)$/)
    if (internal && !BLOG_POSTS.some((other) => other.slug === internal[1])) {
      throw new Error(`prerender: ${where}: links to unknown post "${internal[1]}"`)
    }
  }
  if (!post.sources?.length || post.sources.some((source) => !source.label || !source.url.startsWith('https://'))) {
    throw new Error(`prerender: ${where}: needs sources, each with a label and an https URL`)
  }
}

/** BlogPosting structured data for one post. */
function blogPostJsonLd(post) {
  const url = `${SITE_URL}/blog/${post.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.checked,
    url,
    mainEntityOfPage: url,
    inLanguage: 'en',
    author: { '@type': 'Person', name: 'Marc de Ruijter', url: 'https://dizid.com' },
    publisher: { '@type': 'Organization', name: 'TuneCraft', url: `${SITE_URL}/` },
  }
}

const sitemap = await readFile(join(root, 'public', 'sitemap.xml'), 'utf8')
const llmsTxt = await readFile(join(root, 'public', 'llms.txt'), 'utf8')
const slugs = new Set()
for (const post of BLOG_POSTS) {
  checkBlogPost(post)
  if (slugs.has(post.slug)) throw new Error(`prerender: two blog posts use the slug "${post.slug}"`)
  slugs.add(post.slug)
  const url = `${SITE_URL}/blog/${post.slug}`
  if (!sitemap.includes(`<loc>${url}</loc>`)) throw new Error(`prerender: blog post "${post.slug}" is missing from public/sitemap.xml`)
  if (!llmsTxt.includes(`(${url})`)) throw new Error(`prerender: blog post "${post.slug}" is missing from public/llms.txt`)
}

PAGES.push(
  {
    path: '/blog',
    file: 'blog.html',
    head: {
      title: 'Guides: your music history, exported | TuneCraft',
      description: 'Step-by-step guides to getting your listening history out of YouTube, Shazam, Last.fm and ListenBrainz, checked against each service\'s own help pages.',
    },
  },
  ...BLOG_POSTS.map((post) => ({
    path: `/blog/${post.slug}`,
    // <path>.html (not <path>/index.html) so Netlify serves it without a trailing-slash redirect
    file: `blog/${post.slug}.html`,
    head: { title: `${post.title} | TuneCraft`, description: post.description, jsonLd: blogPostJsonLd(post), ogType: 'article' },
  })),
)

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
function headFor(html, path, { title, description, jsonLd, ogType }) {
  const url = `${SITE_URL}${path}`
  let page = setTagValue(html, /(<title>)[^<]*(<\/title>)/, title, 'title')
  if (ogType) page = setTagValue(page, /(<meta property="og:type" content=")[^"]*(")/, ogType, 'og:type')
  page = setTagValue(page, /(<meta name="description" content=")[^"]*(")/, description, 'meta description')
  page = setTagValue(page, /(<meta property="og:url" content=")[^"]*(")/, url, 'og:url')
  page = setTagValue(page, /(<meta property="og:title" content=")[^"]*(")/, title, 'og:title')
  page = setTagValue(page, /(<meta property="og:description" content=")[^"]*(")/, description, 'og:description')
  page = setTagValue(page, /(<meta name="twitter:title" content=")[^"]*(")/, title, 'twitter:title')
  page = setTagValue(page, /(<meta name="twitter:description" content=")[^"]*(")/, description, 'twitter:description')
  page = setTagValue(page, /(<link rel="canonical" href=")[^"]*(")/, url, 'canonical')
  if (jsonLd) {
    // "<" escaped so no value can close the script tag early
    const script = `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`
    page = page.replace('</head>', () => `  ${script}\n</head>`)
  }
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
  await mkdir(dirname(join(distDir, file)), { recursive: true })
  await writeFile(join(distDir, file), page)
  console.log(`prerender: ${path} -> ${file} (${Math.round(appHtml.length / 1024)} KB of HTML)`)
}

console.log('prerender: app-shell.html for other routes')
