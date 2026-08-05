import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

// Dynamically set NEXTAUTH_URL from the incoming request so that ngrok,
// Vercel preview URLs, and localhost all work without manual .env changes.
function setAuthUrlFromRequest(req) {
  try {
    const proto = (req.headers.get('x-forwarded-proto') || 'http').split(',')[0].trim()
    const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim()
    if (host) {
      process.env.NEXTAUTH_URL = `${proto}://${host}`
    }
  } catch (_) {}
}

const handler = NextAuth(authOptions)

// Wrap GET/POST to inject NEXTAUTH_URL before NextAuth handles the request
export async function GET(req, ctx) {
  setAuthUrlFromRequest(req)
  return handler(req, ctx)
}
export async function POST(req, ctx) {
  setAuthUrlFromRequest(req)
  return handler(req, ctx)
}
