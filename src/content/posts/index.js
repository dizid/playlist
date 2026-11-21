// Blog registry: every post is a file in this folder (no database), newest first.
// Same pattern as ClientPilot's blog. Used by the blog views and by the build-time
// prerender (scripts/prerender.mjs via src/entry-server.js), which also checks each
// post's tags, lengths and sources and stops the build on a bad post.
//
// A post file exports default { slug, title, description, date, checked, readingMinutes, html, sources }:
// - html: trusted, hand-checked static HTML (rendered with v-html); allowed tags:
//   h2, h3, p, ul, ol, li, a, strong, em, blockquote, code, table, thead, tbody, tr, th, td
// - sources: [{ label, url }], https only; every number, price or step in a post comes from one of them
// - date: publication date, checked: date the facts were last checked (both YYYY-MM-DD)
// - related (optional): 1-3 hand-picked post slugs shown as "Related guides" under the post;
//   the build stops on an unknown slug and on a guide that no other guide links to

const modules = import.meta.glob(['./*.js', '!./index.js'], { eager: true })

export const BLOG_POSTS = Object.values(modules)
  .map((mod) => mod.default)
  .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))

/** The post with this slug, or undefined. */
export function findPost(slug) {
  return BLOG_POSTS.find((post) => post.slug === slug)
}

/** Number of "Related guides" links under each post. */
export const RELATED_POST_COUNT = 3

/**
 * The posts listed under `post` as "Related guides": its hand-picked `related` slugs,
 * or the newest other posts when it has none. Unknown slugs are skipped here; the
 * prerender (scripts/prerender.mjs) stops the build on them, so none go live.
 */
export function relatedPostsFor(post) {
  if (post.related?.length) {
    return post.related
      .map((slug) => findPost(slug))
      .filter((related) => related !== undefined && related.slug !== post.slug)
      .slice(0, RELATED_POST_COUNT)
  }
  return BLOG_POSTS.filter((other) => other.slug !== post.slug).slice(0, RELATED_POST_COUNT)
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** "11 November 2026" from "2026-11-11"; fixed format so the prerendered HTML and the browser agree. */
export function formatPostDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return `${day} ${MONTHS[month - 1]} ${year}`
}
