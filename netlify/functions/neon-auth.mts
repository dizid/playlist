// Neon Auth proxy - rewrites cookies to our domain for cross-domain auth
import type { Context } from '@netlify/functions'

export default async (req: Request, context: Context) => {
  const NEON_AUTH_URL = Netlify.env.get('NEON_AUTH_URL')
  if (!NEON_AUTH_URL) {
    return new Response('NEON_AUTH_URL not configured', { status: 500 })
  }

  // Strip /neon prefix, add /neondb/auth prefix, forward to Neon Auth
  const url = new URL(req.url)
  const path = url.pathname.replace('/neon', '')
  // NEON_AUTH_URL is base URL, we need to add /neondb/auth prefix for the SDK paths
  const targetUrl = `${NEON_AUTH_URL}/neondb/auth${path}${url.search}`

  console.log('[Neon Auth Proxy] Forwarding:', req.method, path, '→', targetUrl)

  // Only forward safe headers to prevent header injection
  const safeHeaders: HeadersInit = {
    'Content-Type': req.headers.get('Content-Type') || 'application/json'
  }
  const cookie = req.headers.get('Cookie')
  if (cookie) {
    safeHeaders['Cookie'] = cookie
  }

  const response = await fetch(targetUrl, {
    method: req.method,
    headers: safeHeaders,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined
  })

  // Rewrite cookies to our domain
  const headers = new Headers(response.headers)
  const cookies = response.headers.getSetCookie()
  if (cookies.length > 0) {
    headers.delete('Set-Cookie')
    cookies.forEach(cookie => {
      const rewritten = cookie
        .replace(/Domain=[^;]+;?/gi, '')
        .replace(/SameSite=\w+/gi, 'SameSite=Lax')
      headers.append('Set-Cookie', rewritten)
    })
  }

  // Add security headers to response
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')

  return new Response(response.body, { status: response.status, headers })
}

export const config = { path: '/neon/*' }
