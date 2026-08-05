import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import Admin from '@/models/Admin'
import mongoose from 'mongoose'
export const dynamic = 'force-dynamic'

export async function DELETE(_, { params }) {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.allowed) return auth.error

    const { id } = params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid admin id' }, { status: 400 })
    }
    await dbConnect()
    const target = await Admin.findById(id)
    if (!target) return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    if (target.role === 'super' || target.email === auth.session.user.email.toLowerCase()) {
      return NextResponse.json({ error: 'Cannot remove the owner account' }, { status: 400 })
    }
    await Admin.findByIdAndDelete(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH /api/admins/:id — toggle permissions (music/artists/donations) or rename
export async function PATCH(req, { params }) {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.allowed) return auth.error

    const { id } = params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid admin id' }, { status: 400 })
    }
    await dbConnect()
    const target = await Admin.findById(id)
    if (!target) return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    if (target.role === 'super') {
      return NextResponse.json({ error: 'Cannot modify owner permissions' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const updates = {}
    if (typeof body.name === 'string') updates.name = body.name.slice(0, 100)
    if (body.permissions && typeof body.permissions === 'object') {
      if (typeof body.permissions.music === 'boolean')     updates['permissions.music']     = body.permissions.music
      if (typeof body.permissions.artists === 'boolean')   updates['permissions.artists']   = body.permissions.artists
      if (typeof body.permissions.donations === 'boolean') updates['permissions.donations'] = body.permissions.donations
    }

    const updated = await Admin.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean()
    return NextResponse.json({
      _id: String(updated._id),
      email: updated.email,
      name: updated.name || '',
      role: updated.role,
      permissions: {
        music:     !!updated.permissions?.music,
        artists:   updated.permissions?.artists !== false,
        donations: !!updated.permissions?.donations,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
