import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { resolveAdminRecord } from '@/lib/auth'
export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/me
 * Returns the currently signed-in user + their admin/permission flags.
 * Used by the client to gate UI without needing to parse JWT.
 */
export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user?.email) {
      return NextResponse.json({ authenticated: false })
    }

    const email = session.user.email
    const rec = await resolveAdminRecord(email)

    const isPrimaryOwner = session.user.isPrimaryOwner === true
    const isSuperAdmin = isPrimaryOwner || session.user.isSuperAdmin === true || rec?.role === 'super'
    const perms = session.user.permissions || rec?.permissions || {}

    return NextResponse.json({
      authenticated: true,
      user: {
        name: session.user.name || null,
        email: session.user.email,
        image: session.user.image || null,
        isAdmin: !!rec,
        isPrimaryOwner,
        isSuperAdmin,
        role: isPrimaryOwner ? 'owner' : (isSuperAdmin ? 'super' : (rec ? rec.role : null)),
        permissions: isSuperAdmin
          ? { music: true, artists: true, donations: true, analytics: true, announcements: true }
          : {
              music:         !!perms.music,
              artists:       perms.artists !== false,
              donations:     !!perms.donations,
              analytics:     !!perms.analytics,
              announcements: !!perms.announcements,
            },
      },
    })
  } catch (e) {
    return NextResponse.json({ authenticated: false, error: e.message }, { status: 500 })
  }
}
