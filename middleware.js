// Security middleware: adds HTTP security headers and simple rate limiting.
// Runs before every request — does NOT expose any secrets to the browser.

import { NextResponse } from 'next/server'

// Simple in-memory rate limiter (per-IP). Resets on server restart / Vercel cold start.
const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_MIN = {
  '/api/auth': 30,
  '/api/donations/create-session': 10,
  '/api/contact': 5,
  '/api/upload': 15,
  '/api/webhooks': 60,
  default: 120,
}
const hits = new Map()

function rateLimit(key, limit) {
  const now = Date.now()
  const entry = hits.get(key)
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true, remaining: limit - 1 }
  }
  entry.count += 1
  if (entry.count > limit) return { ok: false, remaining: 0 }
  return { ok: true, remaining: limit - entry.count }
}

let cleanupCounter = 0
function cleanup() {
  cleanupCounter++
  if (cleanupCounter < 500) return
  cleanupCounter = 0
  const now = Date.now()
  for (const [k, v] of hits) {
    if (v.resetAt < now) hits.delete(k)
  }
}

export function middleware(req) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  // ---- Rate limiting ----
  cleanup()
  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim()
  let limit = MAX_REQUESTS_PER_MIN.default
  for (const prefix of Object.keys(MAX_REQUESTS_PER_MIN)) {
    if (prefix !== 'default' && pathname.startsWith(prefix)) { limit = MAX_REQUESTS_PER_MIN[prefix]; break }
  }
  const rl = rateLimit(`${ip}:${pathname.split('/').slice(0,3).join('/')}`, limit)
  res.headers.set('X-RateLimit-Limit', String(limit))
  res.headers.set('X-RateLimit-Remaining', String(rl.remaining))
  if (!rl.ok) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests. Please slow down.' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
    )
  }

  // ---- Security Headers ----
  const headers = res.headers

  headers.set('X-Frame-Options', 'DENY')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-XSS-Protection', '1; mode=block')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains')

  // Content Security Policy — deliberately permissive where needed
  // (Google sign-in, NextAuth, PayMongo hosted checkout all need external resources).
  // We still block object-src, data: URIs in scripts, and framing from other sites.
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://www.google.com https://www.gstatic.com https://cdn.vercel-insights.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: http:",
    "media-src 'self' blob: https: data:",
    "connect-src 'self' https: wss: http:",
    "frame-src 'self' https://accounts.google.com https://checkout.paymongo.com https://www.youtube.com https://www.youtube-nocookie.com https://www.tiktok.com https://player.vimeo.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "upgrade-insecure-requests",
  ].join('; ')
  headers.set('Content-Security-Policy', csp)

  // Don't index Vercel preview URLs
  const host = req.headers.get('host') || ''
  if (host.includes('vercel.app') && !host.startsWith('dle-entertainment')) {
    headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
