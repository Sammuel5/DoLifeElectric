import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import 'server-only'

// Detect the real origin at runtime so we work on localhost, ngrok, or Vercel
// without having to change NEXTAUTH_URL every time a tunnel URL rotates.
export function detectOrigin() {
  if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes('localhost')) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, '')
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '')
  try {
    const h = getHeaders()
    const proto = (h.get('x-forwarded-proto') || 'http').split(',')[0].trim()
    const host = (h.get('x-forwarded-host') || h.get('host') || '').split(',')[0].trim()
    if (host) return `${proto}://${host}`.replace(/\/$/, '')
  } catch (_) {}
  return process.env.NEXTAUTH_URL || 'http://localhost:3000'
}

const providers = []
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Allow linking accounts automatically by email (safe because Google
      // verifies email ownership). This avoids the "Account not linked" error
      // when signing in without a database adapter.
      allowDangerousEmailAccountLinking: true,
    })
  )
}

// ---------------------------------------------------------------------------
// SESSION STRATEGY: pure JWT.
//
// We intentionally DO NOT use the MongoDB session adapter. Why?
//   1. On Windows / strict antivirus networks the MongoDB TLS connection
//      often fails (you saw "tlsv1 alert decode error" in the console).
//   2. NextAuth's callback-handler crashes with
//        "Cannot read properties of null (reading 'id')"
//      when the adapter returns null from createUser() on a failed DB
//      connection — there's no clean way to "fall back" once you've attached
//      an adapter.
//   3. JWT sessions are fully self-contained in an encrypted cookie and work
//      perfectly for Google sign-in even with no database at all.
//
// Admin permissions are still resolved against MongoDB in the session
// callback below (gracefully returning "regular user" if the DB is down).
// When the DB is up, owners/admins get their full permission set on every
// request; when it's down, regular users can still browse the site.
// ---------------------------------------------------------------------------
const sessionStrategy = 'jwt'
let adapter = null // no DB adapter — JWT-only sessions

function getSuperAdminEmail() {
  const owner = (process.env.OWNER_EMAIL || '').trim().toLowerCase()
  if (owner) return owner
  const envAdmins = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  if (envAdmins[0]) return envAdmins[0]
  return ''
}

const SUPER_ADMIN = getSuperAdminEmail()
const ENV_ADMINS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

function norm(email) {
  return (email || '').toString().trim().toLowerCase()
}
export { norm }

export function isOwnerEmail(email) {
  return norm(email) === norm(SUPER_ADMIN)
}

function mergePerms(role, docPerms) {
  if (role === 'super') return { music: true, artists: true, donations: true }
  return {
    music:     !!docPerms?.music,
    artists:   docPerms?.artists !== false, // default true for admins
    donations: !!docPerms?.donations,
  }
}

// Timeout helper — wrap any promise so the session/route never hangs waiting
// on a database that might be blocked by antivirus/TLS interception.
function withTimeout(promise, ms, label = 'DB') {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} lookup timed out after ${ms}ms`)), ms)
    }),
  ]).finally(() => clearTimeout(timer))
}

// Try to look up the admin record in MongoDB. Gracefully returns null on any
// connection error OR if it takes longer than ADMIN_LOOKUP_TIMEOUT_MS.
// Goal: sign-in/session routes should be FAST even when DB is unreachable.
const ADMIN_LOOKUP_TIMEOUT_MS = 4000
async function resolveAdminRecord(email) {
  const n = norm(email)
  if (!n) return null

  // Owner is always an owner — short-circuit WITHOUT waiting on DB at all.
  if (n === norm(SUPER_ADMIN)) {
    // Fire-and-forget upsert (don't await — never block session for this).
    if (process.env.MONGODB_URI && !/[<]username[>]/i.test(process.env.MONGODB_URI)) {
      ;(async () => {
        try {
          const { default: dbConnect } = await import('./dbConnect')
          const { default: Admin } = await import('@/models/Admin')
          await withTimeout(dbConnect(), ADMIN_LOOKUP_TIMEOUT_MS, 'owner-upsert')
          await Admin.findOneAndUpdate(
            { email: n },
            { $setOnInsert: { email: n, name: 'Owner', role: 'super', addedBy: 'system', permissions: { music: true, artists: true, donations: true } } },
            { upsert: true, new: true }
          )
        } catch (_) { /* best effort — ignore */ }
      })()
    }
    return { role: 'super', email: n, permissions: { music: true, artists: true, donations: true } }
  }

  // Look up other admins in MongoDB if configured, with a tight timeout.
  if (process.env.MONGODB_URI && !/[<]username[>]/i.test(process.env.MONGODB_URI)) {
    try {
      const { default: dbConnect } = await import('./dbConnect')
      const { default: Admin } = await import('@/models/Admin')
      await withTimeout(dbConnect(), ADMIN_LOOKUP_TIMEOUT_MS, 'admin-lookup')
      const doc = await Admin.findOne({ email: n }).lean()
      if (doc) return { role: doc.role, email: doc.email, permissions: doc.permissions || {} }
    } catch (_) { /* DB down/timeout — fall through to env fallback */ }
  }

  // Legacy ENV_ADMINS fallback (non-super admins get default artist-editor perms).
  if (ENV_ADMINS.includes(n)) {
    return { role: 'admin', email: n, permissions: { artists: true, music: false, donations: false } }
  }
  return null
}

export async function resolveAdminRole(email) {
  const rec = await resolveAdminRecord(email)
  return rec?.role || null
}

export const authOptions = {
  providers,
  adapter,
  session: { strategy: sessionStrategy },
  callbacks: {
    // JWT callback runs on sign-in and on every session refresh. The token is
    // the source of truth (we don't rely on a database session).
    async jwt({ token, user, account, profile }) {
      // On first sign-in (user object present from Google), enrich the token.
      if (user) {
        token.id = user.id || profile?.sub || token.sub
        token.email = user.email || token.email
        token.name = user.name || token.name
        token.picture = user.picture || token.picture
      }
      // Resolve admin role (best-effort; returns null if DB is down).
      try {
        const email = token.email
        const rec = email ? await resolveAdminRecord(email) : null
        token.adminRole = rec?.role || null
        token.isAdmin = !!rec
        token.isSuperAdmin = rec?.role === 'super'
        token.permissions = rec ? mergePerms(rec.role, rec.permissions) : null
      } catch (_) {
        token.adminRole = null
        token.isAdmin = false
        token.isSuperAdmin = false
        token.permissions = null
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user && token) {
        session.user.id = token.id || token.sub
        session.user.email = token.email || session.user.email
        session.user.name = token.name || session.user.name
        session.user.image = token.picture || session.user.image
        const sessEmail = norm(session.user.email)

        // Owner short-circuit (always true, no DB needed)
        if (sessEmail === norm(SUPER_ADMIN)) {
          session.user.adminRole = 'super'
          session.user.isAdmin = true
          session.user.isSuperAdmin = true
          session.user.permissions = { music: true, artists: true, donations: true }
        } else {
          // Re-resolve from DB on each session call so permission changes
          // take effect immediately (best-effort; cached token used if DB down).
          let role = token.adminRole || null
          let perms = token.permissions || null
          if (process.env.MONGODB_URI && !/[<]username[>]/i.test(process.env.MONGODB_URI || '')) {
            try {
              const rec = await resolveAdminRecord(session.user.email)
              if (rec) { role = rec.role; perms = mergePerms(rec.role, rec.permissions) }
              else { role = null; perms = null }
            } catch (_) { /* use token values on DB failure */ }
          }
          session.user.adminRole = role
          session.user.isAdmin = !!role
          session.user.isSuperAdmin = false
          session.user.permissions = perms
        }
      }
      return session
    },
    // Always allow sign-in (we still create sessions for regular fans).
    async signIn({ account, profile }) {
      if (account?.provider === 'google') {
        // Only allow sign-in if Google verified the email.
        return !!(profile?.email_verified ?? profile?.email)
      }
      return true
    },
  },
  pages: { signIn: '/login', error: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
}

export { SUPER_ADMIN }
export default NextAuth(authOptions)

// ---------------------------------------------------------------------------
// Route helpers (used by /api/* handlers)
// ---------------------------------------------------------------------------
function unauth() {
  return { allowed: false, error: NextResponse.json({ error: 'Unauthorized: please sign in' }, { status: 401 }) }
}
function forbidden(msg) {
  return { allowed: false, error: NextResponse.json({ error: msg || 'Forbidden' }, { status: 403 }) }
}

export async function getSession() {
  try { return await getServerSession(authOptions) } catch (_) { return null }
}

export async function requireUser() {
  const session = await getSession()
  if (!session?.user?.email) return unauth()
  return { allowed: true, session }
}

export async function requireSuperAdmin() {
  const session = await getSession()
  if (!session?.user?.email) return unauth()
  const email = norm(session.user.email)
  if (email === norm(SUPER_ADMIN) || session.user.isSuperAdmin) return { allowed: true, session }
  try {
    const rec = await resolveAdminRecord(email)
    if (rec?.role === 'super') return { allowed: true, session }
  } catch (_) {}
  return forbidden('Forbidden: only the owner can do this')
}

export async function requirePermission(perm) {
  const session = await getSession()
  if (!session?.user?.email) return unauth()
  const email = norm(session.user.email)
  if (email === norm(SUPER_ADMIN) || session.user.isSuperAdmin) return { allowed: true, session }
  const perms = session.user?.permissions
  if (perms && perms[perm] === true) return { allowed: true, session }
  try {
    const rec = await resolveAdminRecord(email)
    const merged = rec ? mergePerms(rec.role, rec.permissions) : null
    if (rec && merged?.[perm]) return { allowed: true, session }
  } catch (_) {}
  return forbidden(`Forbidden: you don't have ${perm} permission`)
}

export async function requireAnyAdmin() {
  const session = await getSession()
  if (!session?.user?.email) return unauth()
  const email = norm(session.user.email)
  if (email === norm(SUPER_ADMIN) || session.user.isSuperAdmin) return { allowed: true, session }
  if (session.user.isAdmin) return { allowed: true, session }
  try {
    const rec = await resolveAdminRecord(email)
    if (rec) return { allowed: true, session }
  } catch (_) {}
  return forbidden('Forbidden: admin access required')
}
