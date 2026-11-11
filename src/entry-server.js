// Server entry for the build-time prerender (scripts/prerender.mjs), same pattern as
// TestSwap and ClientPilot. Built with `vite build --ssr` into dist-ssr/ and never shipped
// to the browser. It renders the landing page of the real app to HTML, so crawlers that
// don't run JavaScript (AI crawlers, link fetchers) can read what TuneCraft is.

import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import { renderToString } from 'vue/server-renderer'
import App from './App.vue'
import router from './router'

// Blog posts for the prerender script (pages, head tags, JSON-LD, build-time checks)
export { BLOG_POSTS } from './content/posts'

/** The app's HTML for one route, ready to go inside <div id="app">. */
export async function render(url) {
  const app = createSSRApp(App)
  app.use(createPinia())
  app.use(router)
  await router.push(url)
  await router.isReady()
  return renderToString(app)
}
