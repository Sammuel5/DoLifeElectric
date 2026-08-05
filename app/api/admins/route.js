import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import Admin from '@/models/Admin'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.allowed) return auth.error
    await dbConnect()
    const admins = await Admin.find({}).sort({ createdAt: 1 }).lean()
    return NextResponse.json(admins.map(a => ({
      _id: String(a._id),
      email: a.email,
      name: a.name || '',
      role: a.role,
      permissions: {
        music:     !!a.permissions?.music,
        artists:   a.permissions?.artists !== false,
        donations: !!a.permissions?.donations,
      },
      addedBy: a.addedBy || '',
      createdAt: a.createdAt,
    })))
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.allowed) return auth.error
    await dbConnect()
    const body = await req.json().catch(() => ({}))
    const email = (body.email || '').trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }
    if (email === auth.session.user.email.toLowerCase()) {
      return NextResponse.json({ error: 'That is your own (owner) account.' }, { status: 400 })
    }

    const existing = await Admin.findOne({ email })
    if (existing) return NextResponse.json({ error: 'That admin already exists.' }, { status: 409 })

    const admin = await Admin.create({
      email,
      name: body.name || email.split('@')[0],
      role: 'admin',
      addedBy: auth.session.user.email,
      permissions: {
        music:     !!body.permissions?.music,
        artists:   body.permissions?.artists !== false, // default true
        donations: !!body.permissions?.donations,
      },
    })

    return NextResponse.json({
      _id: String(admin._id),
      email: admin.email,
      name: admin.name,
      role: admin.role,
      permissions: admin.permissions,
      addedBy: admin.addedBy,
      createdAt: admin.createdAt,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
