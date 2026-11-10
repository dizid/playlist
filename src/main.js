import { createApp, createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'

// The landing page is prerendered at build time (scripts/prerender.mjs) for crawlers that
// don't run JavaScript. When this HTML was prerendered for this exact path, hydrate it
// (reuse it) instead of rendering again; every other route gets the plain app shell.
const renderedFor = document.getElementById('app')?.dataset.ssgRoute
const path = window.location.pathname.replace(/\/+$/, '') || '/'
const hydrate = renderedFor === path

const app = hydrate ? createSSRApp(App) : createApp(App)

app.use(createPinia())
app.use(router)

if (hydrate) {
  // Hydration needs the route (and its lazy component) resolved first
  router.isReady().then(() => app.mount('#app'))
} else {
  app.mount('#app')
}
