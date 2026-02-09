// Neon Auth proxy - rewrites cookies to our domain for cross-domain auth
import type { Context } from '@netlify/functions'
import { validateOrigin, getAllowedOrigins } from './_shared/auth.ts'

// Timeout for upstream Neon Auth requests
const UPSTREAM_TIMEOUT_MS = 10_000

export default async (req: Request, context: Context) => {
  const NEON_AUTH_URL = Netlify.env.get('NEON_AUTH_URL')
  if (!NEON_AUTH_URL) {
    console.error('[Neon Auth Proxy] NEON_AUTH_URL not configured')
    return jsonError('Auth service not configured', 500)
  }

  // Strip /neon prefix, add /neondb/auth prefix, forward to Neon Auth
  const url = new URL(req.url)
  const path = url.pathname.replace('/neon', '')
  const targetUrl = `${NEON_AUTH_URL}/neondb/auth${path}${url.search}`

  // Forward safe headers needed for auth
  const safeHeaders: HeadersInit = {
    'Content-Type': req.headers.get('Content-Type') || 'application/json'
  }
  const cookie = req.headers.get('Cookie')
  if (cookie) {
    safeHeaders['Cookie'] = cookie
  }

  // Origin header is required by Better Auth for callback URL resolution
  // Only forward if the origin is in our allowed list
  const validOrigin = validateOrigin(req)
  if (validOrigin) {
    safeHeaders['Origin'] = validOrigin
  } else if (req.headers.get('Origin')) {
    console.error('[Neon Auth Proxy] Blocked origin:', req.headers.get('Origin'), '| Allowed:', getAllowedOrigins().join(', '))
    return jsonError('Origin not allowed', 403)
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: safeHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
      signal: controller.signal,
      redirect: 'manual'  // Don't follow redirects — pass 302s through for OAuth callbacks
    })

    clearTimeout(timeout)

    // Rewrite cookies to our domain
    const headers = new Headers(response.headers)
    const cookies = response.headers.getSetCookie()
    if (cookies.length > 0) {
      headers.delete('Set-Cookie')
      cookies.forEach(c => {
        const rewritten = c
          .replace(/Domain=[^;]+;?/gi, '')
          .replace(/SameSite=\w+/gi, 'SameSite=Lax')
        headers.append('Set-Cookie', rewritten)
      })
    }

    // Add security headers to response
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-Frame-Options', 'DENY')

    return new Response(response.body, { status: response.status, headers })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('[Neon Auth Proxy] Upstream timeout after', UPSTREAM_TIMEOUT_MS, 'ms')
      return jsonError('Auth service timeout', 504)
    }
    console.error('[Neon Auth Proxy] Upstream error:', error instanceof Error ? error.message : error)
    return jsonError('Auth service unavailable', 502)
  }
}

// JSON error response helper
function jsonError(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' } }
  )
}

export const config = { path: ['/neon/*', '/api/auth/*'] }
