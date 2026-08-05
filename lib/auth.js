import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { MongoDBAdapter } from '@next-auth/mongodb-adapter'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import clientPromise from './mongodb'
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
    })
  )
}

let adapter = null
let sessionStrategy = 'jwt'
// Only attach MongoDBAdapter if the client promise actually resolves to a client.
// If the DB is unreachable (null), stay on JWT-only — login still works, DB features don't.
if (clientPromise && process.env.MONGODB_URI) {
  const wrapped = clientPromise.then(client => {
    if (client) {
      try {
        // Force the adapter to use the "DoLifeElectric" database too so sessions/users are in the same place
        const adapter = MongoDBAdapter(Promise.resolve(client), { databaseName: 'DoLifeElectric' })
        return adapter
      } catch (e) {
        console.warn('⚠ Could not create MongoDBAdapter:', e.message)
        return null
      }
    }
    return null
  }).catch(() => null)
  // NextAuth only needs the adapter methods; if wrapped resolves to null, the
  // adapter effectively becomes a no-op and JWT sessions take over.
  adapter = (() => {
    const methods = ['createUser','getUser','getUserByEmail','getUserByAccount','updateUser','deleteUser','linkAccount','unlinkAccount','getSessionAndUser','createSession','updateSession','deleteSession','createVerificationToken','useVerificationToken','getUserByEmail']
    const proxy = {}
    methods.forEach(m => {
      proxy[m] = async (...args) => {
        const a = await wrapped
        if (a && typeof a[m] === 'function') return a[m](...args)
        return null
      }
    })
    return proxy
  })()
}

function getSuperAdminEmail() {
  const owner = (process.env.OWNER_EMAIL || '').trim().toLowerCase()
  if (owner) return owner
  const envAdmins = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  if (envAdmins[0]) return envAdmins[0]
  return 'ssammuelbarrientos@gmail.com'
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

export async function resolveAdminRecord(email) {
  const n = norm(email)
  if (!n) return null
  if (n === norm(SUPER_ADMIN)) {
    if (process.env.MONGODB_URI) {
      import('./dbConnect').then(async ({ default: dbConnect }) => {
        try {
          const { default: Admin } = await import('@/models/Admin')
          await dbConnect()
          await Admin.findOneAndUpdate(
            { email: n },
            { $setOnInsert: { email: n, name: 'Owner', role: 'super', addedBy: 'system', permissions: { music: true, artists: true, donations: true } } },
            { upsert: true, new: true }
          )
        } catch (_) {}
      }).catch(() => {})
    }
    return { role: 'super', email: n, permissions: { music: true, artists: true, donations: true } }
  }
  if (process.env.MONGODB_URI) {
    try {
      const { default: dbConnect } = await import('./dbConnect')
      const { default: Admin } = await import('@/models/Admin')
      await dbConnect()
      const doc = await Admin.findOne({ email: n }).lean()
      if (doc) return { role: doc.role, email: doc.email, permissions: doc.permissions || {} }
    } catch (_) {}
  }
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        try {
          const rec = await resolveAdminRecord(user.email)
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
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token?.id || token?.sub
        session.user.email = token?.email || session.user.email
        const sessEmail = norm(session.user.email)
        if (sessEmail === norm(SUPER_ADMIN) || session.user.isSuperAdmin) {
          session.user.adminRole = 'super'
          session.user.isAdmin = true
          session.user.isSuperAdmin = true
          session.user.permissions = { music: true, artists: true, donations: true }
        } else {
          // Refresh from DB to catch permission changes
          let perms = token?.permissions || null
          let role = token?.adminRole
          if (process.env.MONGODB_URI) {
            try {
              const rec = await resolveAdminRecord(session.user.email)
              if (rec) { role = rec.role; perms = mergePerms(rec.role, rec.permissions) }
            } catch (_) {}
          }
          session.user.adminRole = role
          session.user.isAdmin = !!role
          session.user.isSuperAdmin = false
          session.user.permissions = perms
        }
      }
      return session
    },
    async signIn() { return true },
  },
  pages: { signIn: '/login', error: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
}

export { SUPER_ADMIN }
export default NextAuth(authOptions)

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
  if (email === norm(SUPER_ADMIN)) return { allowed: true, session }
  if (session.user.isSuperAdmin) return { allowed: true, session }
  try {
    const rec = await resolveAdminRecord(email)
    if (rec?.role === 'super') return { allowed: true, session }
  } catch (_) {}
  return forbidden('Forbidden: only the owner can do this')
}

// Require admin with specific permission (e.g. 'music', 'artists')
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
