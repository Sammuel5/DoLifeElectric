import { NextResponse } from 'next/server'
import { requirePrimaryOwner, norm, SUPER_ADMIN } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import { isDbDownError } from '@/lib/dbSafe'
import Admin from '@/models/Admin'
import mongoose from 'mongoose'
export const dynamic = 'force-dynamic'

// Only the configured OWNER_EMAIL is truly undeletable / unmodifiable.
// Promoted co-owners (role:'super') CAN be demoted or removed by the primary
// owner.
function isProtectedOwner(email) {
  return norm(email) === norm(SUPER_ADMIN)
}

function shape(a) {
  return {
    _id: String(a._id),
    email: a.email,
    name: a.name || '',
    role: a.role || 'admin',
    isPrimaryOwner: norm(a.email) === norm(SUPER_ADMIN),
    permissions: {
      music:         a.role === 'super' ? true : !!a.permissions?.music,
      artists:       a.role === 'super' ? true : a.permissions?.artists !== false,
      donations:     a.role === 'super' ? true : !!a.permissions?.donations,
      analytics:     a.role === 'super' ? true : !!a.permissions?.analytics,
      announcements: a.role === 'super' ? true : !!a.permissions?.announcements,
    },
  }
}

export async function DELETE(_, { params }) {
  try {
    const auth = await requirePrimaryOwner()
    if (!auth.allowed) return auth.error

    const { id } = params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid admin id' }, { status: 400 })
    }
    await dbConnect()
    const target = await Admin.findById(id)
    if (!target) return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    if (isProtectedOwner(target.email)) {
      return NextResponse.json({ error: 'Cannot remove the primary owner account.' }, { status: 400 })
    }
    await Admin.findByIdAndDelete(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (isDbDownError(e)) {
      return NextResponse.json(
        { error: 'Database unavailable', dbDown: true },
        { status: 503, headers: { 'x-db-down': '1' } }
      )
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH /api/admins/:id — rename, change permissions, OR promote/demote role.
// PRIMARY OWNER ONLY.
export async function PATCH(req, { params }) {
  try {
    const auth = await requirePrimaryOwner()
    if (!auth.allowed) return auth.error

    const { id } = params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid admin id' }, { status: 400 })
    }
    await dbConnect()
    const target = await Admin.findById(id)
    if (!target) return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    if (isProtectedOwner(target.email)) {
      return NextResponse.json({ error: 'Cannot modify the primary owner.' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const updates = {}
    if (typeof body.name === 'string') updates.name = body.name.slice(0, 100)

    // Role change (promote to co-owner / demote to admin)
    const finalRole =
      (typeof body.role === 'string' && ['super', 'admin'].includes(body.role))
        ? body.role
        : (target.role || 'admin')
    if (finalRole !== target.role) updates.role = finalRole

    if (finalRole === 'super') {
      // Co-owners always have every data permission.
      updates['permissions.music'] = true
      updates['permissions.artists'] = true
      updates['permissions.donations'] = true
      updates['permissions.analytics'] = true
      updates['permissions.announcements'] = true
    } else if (body.permissions && typeof body.permissions === 'object') {
      if (typeof body.permissions.music === 'boolean')         updates['permissions.music']         = body.permissions.music
      if (typeof body.permissions.artists === 'boolean')       updates['permissions.artists']       = body.permissions.artists
      if (typeof body.permissions.donations === 'boolean')     updates['permissions.donations']     = body.permissions.donations
      if (typeof body.permissions.analytics === 'boolean')     updates['permissions.analytics']     = body.permissions.analytics
      if (typeof body.permissions.announcements === 'boolean') updates['permissions.announcements'] = body.permissions.announcements
    }

    const updated = await Admin.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true }).lean()
    return NextResponse.json(shape(updated))
  } catch (e) {
    if (isDbDownError(e)) {
      return NextResponse.json(
        { error: 'Database unavailable', dbDown: true },
        { status: 503, headers: { 'x-db-down': '1' } }
      )
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
