import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import 'server-only'

export function detectOrigin() {
  if (
    process.env.NEXTAUTH_URL &&
    !process.env.NEXTAUTH_URL.includes('localhost')
  ) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, '')
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '')
  }

  try {
    const h = getHeaders()

    const proto = (h.get('x-forwarded-proto') || 'http')
      .split(',')[0]
      .trim()

    const host = (
      h.get('x-forwarded-host') ||
      h.get('host') ||
      ''
    )
      .split(',')[0]
      .trim()

    if (host) {
      return `${proto}://${host}`.replace(/\/$/, '')
    }
  } catch (_) {
    // headers() may not be available in every context
  }

  return process.env.NEXTAUTH_URL || 'http://localhost:3000'
}

// ---------------------------------------------------------------------------
// Google Provider
// ---------------------------------------------------------------------------

const providers = []

if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET
) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,

      // Allow linking accounts automatically by email.
      allowDangerousEmailAccountLinking: true,
    })
  )
}

// ---------------------------------------------------------------------------
// SESSION STRATEGY
//
// We intentionally use JWT sessions and do NOT use the MongoDB adapter.
//
// MongoDB is only used to resolve admin permissions.
// If MongoDB is unavailable, normal users can still sign in and use the site.
// ---------------------------------------------------------------------------

const sessionStrategy = 'jwt'

const adapter = null

// ---------------------------------------------------------------------------
// Admin configuration
// ---------------------------------------------------------------------------

function getSuperAdminEmail() {
  const owner = (process.env.OWNER_EMAIL || '')
    .trim()
    .toLowerCase()

  if (owner) return owner

  const envAdmins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  if (envAdmins[0]) return envAdmins[0]

  return ''
}

const SUPER_ADMIN = getSuperAdminEmail()

const ENV_ADMINS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function norm(email) {
  return (email || '')
    .toString()
    .trim()
    .toLowerCase()
}

export { norm }

export function isOwnerEmail(email) {
  return norm(email) === norm(SUPER_ADMIN)
}

// ---------------------------------------------------------------------------
// Permission handling
// ---------------------------------------------------------------------------

function mergePerms(role, docPerms) {
  if (role === 'super') {
    return {
      music: true,
      artists: true,
      donations: true,
    }
  }

  return {
    music: !!docPerms?.music,
    artists: docPerms?.artists !== false,
    donations: !!docPerms?.donations,
  }
}

// ---------------------------------------------------------------------------
// Timeout helper
// ---------------------------------------------------------------------------

function withTimeout(promise, ms, label = 'DB') {
  let timer

  return Promise.race([
    promise,

    new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new Error(
            `${label} lookup timed out after ${ms}ms`
          )
        )
      }, ms)
    }),
  ]).finally(() => {
    clearTimeout(timer)
  })
}

// ---------------------------------------------------------------------------
// Resolve admin record
//
// IMPORTANT:
// This is exported because API routes such as
// /api/auth/me/route.js import it directly.
//
// This function:
//   1. Checks whether the user is the owner.
//   2. Looks up other admins in MongoDB.
//   3. Falls back to ADMIN_EMAILS.
//   4. Returns null for regular users.
// ---------------------------------------------------------------------------

const ADMIN_LOOKUP_TIMEOUT_MS = 4000

export async function resolveAdminRecord(email) {
  const n = norm(email)

  if (!n) {
    return null
  }

  // -------------------------------------------------------------------------
  // Owner is always a super admin.
  // Do not wait for MongoDB.
  // -------------------------------------------------------------------------

  if (n === norm(SUPER_ADMIN)) {
    // Best-effort MongoDB upsert.
    // We intentionally do not await this operation.
    if (
      process.env.MONGODB_URI &&
      !/[<]username[>]/i.test(process.env.MONGODB_URI)
    ) {
      ;(async () => {
        try {
          const { default: dbConnect } = await import('./dbConnect')
          const { default: Admin } = await import('@/models/Admin')

          await withTimeout(
            dbConnect(),
            ADMIN_LOOKUP_TIMEOUT_MS,
            'owner-upsert'
          )

          await Admin.findOneAndUpdate(
            { email: n },
            {
              $setOnInsert: {
                email: n,
                name: 'Owner',
                role: 'super',
                addedBy: 'system',
                permissions: {
                  music: true,
                  artists: true,
                  donations: true,
                },
              },
            },
            {
              upsert: true,
              new: true,
            }
          )
        } catch (_) {
          // Best effort only.
          // Ignore MongoDB errors.
        }
      })()
    }

    return {
      role: 'super',
      email: n,
      permissions: {
        music: true,
        artists: true,
        donations: true,
      },
    }
  }

  // -------------------------------------------------------------------------
  // Look up other admins in MongoDB.
  // -------------------------------------------------------------------------

  if (
    process.env.MONGODB_URI &&
    !/[<]username[>]/i.test(process.env.MONGODB_URI)
  ) {
    try {
      const { default: dbConnect } = await import('./dbConnect')
      const { default: Admin } = await import('@/models/Admin')

      await withTimeout(
        dbConnect(),
        ADMIN_LOOKUP_TIMEOUT_MS,
        'admin-lookup'
      )

      const doc = await Admin.findOne({
        email: n,
      }).lean()

      if (doc) {
        return {
          role: doc.role,
          email: doc.email,
          permissions: doc.permissions || {},
        }
      }
    } catch (_) {
      // MongoDB is unavailable or timed out.
      // Continue to ENV_ADMINS fallback.
    }
  }

  // -------------------------------------------------------------------------
  // Legacy environment-variable admin fallback.
  // -------------------------------------------------------------------------

  if (ENV_ADMINS.includes(n)) {
    return {
      role: 'admin',
      email: n,
      permissions: {
        artists: true,
        music: false,
        donations: false,
      },
    }
  }

  // Regular user.
  return null
}

// ---------------------------------------------------------------------------
// Resolve admin role
// ---------------------------------------------------------------------------

export async function resolveAdminRole(email) {
  const rec = await resolveAdminRecord(email)

  return rec?.role || null
}

// ---------------------------------------------------------------------------
// NextAuth configuration
// ---------------------------------------------------------------------------

export const authOptions = {
  providers,

  adapter,

  session: {
    strategy: sessionStrategy,
  },

  callbacks: {
    // -----------------------------------------------------------------------
    // JWT callback
    // -----------------------------------------------------------------------

    async jwt({ token, user, profile }) {
      // First sign-in.
      if (user) {
        token.id = user.id || profile?.sub || token.sub
        token.email = user.email || token.email
        token.name = user.name || token.name
        token.picture = user.picture || token.picture
      }

      // Resolve admin role.
      try {
        const email = token.email

        const rec = email
          ? await resolveAdminRecord(email)
          : null

        token.adminRole = rec?.role || null
        token.isAdmin = !!rec
        token.isSuperAdmin = rec?.role === 'super'

        token.permissions = rec
          ? mergePerms(rec.role, rec.permissions)
          : null
      } catch (_) {
        token.adminRole = null
        token.isAdmin = false
        token.isSuperAdmin = false
        token.permissions = null
      }

      return token
    },

    // -----------------------------------------------------------------------
    // Session callback
    // -----------------------------------------------------------------------

    async session({ session, token }) {
      if (session?.user && token) {
        session.user.id = token.id || token.sub
        session.user.email =
          token.email || session.user.email
        session.user.name =
          token.name || session.user.name
        session.user.image =
          token.picture || session.user.image

        const sessEmail = norm(session.user.email)

        // -------------------------------------------------------------------
        // Owner always gets full permissions.
        // -------------------------------------------------------------------

        if (sessEmail === norm(SUPER_ADMIN)) {
          session.user.adminRole = 'super'
          session.user.isAdmin = true
          session.user.isSuperAdmin = true

          session.user.permissions = {
            music: true,
            artists: true,
            donations: true,
          }
        } else {
          // -----------------------------------------------------------------
          // Re-resolve permissions from MongoDB.
          // -----------------------------------------------------------------

          let role = token.adminRole || null
          let perms = token.permissions || null

          if (
            process.env.MONGODB_URI &&
            !/[<]username[>]/i.test(
              process.env.MONGODB_URI || ''
            )
          ) {
            try {
              const rec = await resolveAdminRecord(
                session.user.email
              )

              if (rec) {
                role = rec.role
                perms = mergePerms(
                  rec.role,
                  rec.permissions
                )
              } else {
                role = null
                perms = null
              }
            } catch (_) {
              // Keep token values if MongoDB fails.
            }
          }

          session.user.adminRole = role
          session.user.isAdmin = !!role
          session.user.isSuperAdmin = false
          session.user.permissions = perms
        }
      }

      return session
    },

    // -----------------------------------------------------------------------
    // Sign-in callback
    // -----------------------------------------------------------------------

    async signIn({ account, profile }) {
      if (account?.provider === 'google') {
        // Only allow Google accounts with verified email.
        return !!(
          profile?.email_verified ??
          profile?.email
        )
      }

      return true
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  secret: process.env.NEXTAUTH_SECRET,

  debug: false,
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { SUPER_ADMIN }

// ---------------------------------------------------------------------------
// NextAuth handler
// ---------------------------------------------------------------------------

export default NextAuth(authOptions)

// ---------------------------------------------------------------------------
// Route helpers
// ---------------------------------------------------------------------------

function unauth() {
  return {
    allowed: false,
    error: NextResponse.json(
      {
        error: 'Unauthorized: please sign in',
      },
      {
        status: 401,
      }
    ),
  }
}

function forbidden(msg) {
  return {
    allowed: false,
    error: NextResponse.json(
      {
        error: msg || 'Forbidden',
      },
      {
        status: 403,
      }
    ),
  }
}

// ---------------------------------------------------------------------------
// Get current session
// ---------------------------------------------------------------------------

export async function getSession() {
  try {
    return await getServerSession(authOptions)
  } catch (_) {
    return null
  }
}

// ---------------------------------------------------------------------------
// Require authenticated user
// ---------------------------------------------------------------------------

export async function requireUser() {
  const session = await getSession()

  if (!session?.user?.email) {
    return unauth()
  }

  return {
    allowed: true,
    session,
  }
}

// ---------------------------------------------------------------------------
// Require super admin
// ---------------------------------------------------------------------------

export async function requireSuperAdmin() {
  const session = await getSession()

  if (!session?.user?.email) {
    return unauth()
  }

  const email = norm(session.user.email)

  // Owner check.
  if (
    email === norm(SUPER_ADMIN) ||
    session.user.isSuperAdmin
  ) {
    return {
      allowed: true,
      session,
    }
  }

  // Database check.
  try {
    const rec = await resolveAdminRecord(email)

    if (rec?.role === 'super') {
      return {
        allowed: true,
        session,
      }
    }
  } catch (_) {
    // Ignore lookup errors.
  }

  return forbidden(
    'Forbidden: only the owner can do this'
  )
}

// ---------------------------------------------------------------------------
// Require specific permission
// ---------------------------------------------------------------------------

export async function requirePermission(perm) {
  const session = await getSession()

  if (!session?.user?.email) {
    return unauth()
  }

  const email = norm(session.user.email)

  // Owner / super admin gets everything.
  if (
    email === norm(SUPER_ADMIN) ||
    session.user.isSuperAdmin
  ) {
    return {
      allowed: true,
      session,
    }
  }

  // Check permissions already stored in session.
  const perms = session.user?.permissions

  if (perms && perms[perm] === true) {
    return {
      allowed: true,
      session,
    }
  }

  // Check database directly.
  try {
    const rec = await resolveAdminRecord(email)

    const merged = rec
      ? mergePerms(rec.role, rec.permissions)
      : null

    if (rec && merged?.[perm]) {
      return {
        allowed: true,
        session,
      }
    }
  } catch (_) {
    // Ignore lookup errors.
  }

  return forbidden(
    `Forbidden: you don't have ${perm} permission`
  )
}

// ---------------------------------------------------------------------------
// Require any admin
// ---------------------------------------------------------------------------

export async function requireAnyAdmin() {
  const session = await getSession()

  if (!session?.user?.email) {
    return unauth()
  }

  const email = norm(session.user.email)

  // Owner / super admin.
  if (
    email === norm(SUPER_ADMIN) ||
    session.user.isSuperAdmin
  ) {
    return {
      allowed: true,
      session,
    }
  }

  // Admin according to session.
  if (session.user.isAdmin) {
    return {
      allowed: true,
      session,
    }
  }

  // Database check.
  try {
    const rec = await resolveAdminRecord(email)

    if (rec) {
      return {
        allowed: true,
        session,
      }
    }
  } catch (_) {
    // Ignore lookup errors.
  }

  return forbidden(
    'Forbidden: admin access required'
  )
}