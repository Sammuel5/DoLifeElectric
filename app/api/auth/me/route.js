import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions, SUPER_ADMIN, resolveAdminRecord } from '@/lib/auth'
export const dynamic = 'force-dynamic'

// Returns the current user's role/permissions so the admin UI knows which tabs to show.
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ signedIn: false })
    }
    const email = session.user.email
    const isOwner = email.toLowerCase() === SUPER_ADMIN.toLowerCase()

    let role = session.user.adminRole || null
    let permissions = session.user.permissions || null
    if (!role) {
      const rec = await resolveAdminRecord(email)
      if (rec) { role = rec.role; permissions = rec.role === 'super' ? { music: true, artists: true } : (rec.permissions || { artists: true }) }
    }
    return NextResponse.json({
      signedIn: true,
      email,
      name: session.user.name || '',
      isOwner,
      isAdmin: isOwner || !!role,
      isSuperAdmin: isOwner || role === 'super',
      role: isOwner ? 'super' : role,
      permissions: isOwner ? { music: true, artists: true } : (permissions || { music: false, artists: false }),
    })
  } catch (e) {
    return NextResponse.json({ signedIn: false, error: e.message })
  }
}
