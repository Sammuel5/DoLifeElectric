import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import Announcement from '@/models/Announcement'
import { deleteFromCloudinary } from '@/lib/cloudinary'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function notFound() {
  return NextResponse.json({ error: 'Announcement not found.' }, { status: 404 })
}

/**
 * PATCH /api/announcements/:id
 * ADMIN — update fields. Only provided fields are changed.
 */
export async function PATCH(req, { params }) {
  const auth = await requirePermission('announcements')
  if (!auth.allowed) return auth.error

  try {
    await dbConnect()
    const id = params?.id
    const existing = await Announcement.findById(id)
    if (!existing) return notFound()

    const body = await req.json().catch(() => ({}))
    const allowed = ['title', 'message', 'type', 'effect', 'mediaUrl', 'publicId',
      'durationSec', 'startsAt', 'endsAt', 'active', 'showOncePerUser']

    for (const key of allowed) {
      if (!(key in body)) continue
      if (key === 'durationSec') {
        const v = Number(body.durationSec)
        if (isNaN(v) || v < 3 || v > 120) return NextResponse.json({ error: 'Duration must be 3–120 seconds.' }, { status: 400 })
        existing.durationSec = v
      } else if (key === 'active') {
        existing.active = !!body.active
      } else if (key === 'showOncePerUser') {
        existing.showOncePerUser = body.showOncePerUser !== false
      } else if (key === 'startsAt' || key === 'endsAt') {
        existing[key] = body[key] ? new Date(body[key]) : null
      } else if (key === 'type') {
        if (!['image', 'video'].includes(body.type)) return NextResponse.json({ error: 'Invalid type.' }, { status: 400 })
        existing.type = body.type
      } else if (key === 'effect') {
        if (!['none', 'fireworks', 'balloons'].includes(body.effect)) return NextResponse.json({ error: 'Invalid effect.' }, { status: 400 })
        existing.effect = body.effect
      } else if (key === 'title') {
        if (!body.title || !body.title.trim()) return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
        existing.title = body.title.trim().slice(0, 120)
      } else if (key === 'message') {
        existing.message = (body.message || '').toString().trim().slice(0, 400)
      } else if (key === 'mediaUrl') {
        if (!body.mediaUrl) return NextResponse.json({ error: 'mediaUrl is required.' }, { status: 400 })
        existing.mediaUrl = body.mediaUrl
      } else if (key === 'publicId') {
        existing.publicId = body.publicId || ''
      }
    }

    await existing.save()
    return NextResponse.json({ ok: true, announcement: { id: existing._id.toString() } })
  } catch (e) {
    console.error('[announcements PATCH]', e)
    return NextResponse.json({ error: e.message || 'Update failed.' }, { status: 500 })
  }
}

/**
 * DELETE /api/announcements/:id
 * ADMIN — remove an announcement. Also attempts to delete the Cloudinary
 * asset if one was stored.
 */
export async function DELETE(req, { params }) {
  const auth = await requirePermission('announcements')
  if (!auth.allowed) return auth.error

  try {
    await dbConnect()
    const id = params?.id
    const existing = await Announcement.findById(id)
    if (!existing) return notFound()

    // Best-effort Cloudinary cleanup (don't block the delete on this)
    if (existing.publicId) {
      deleteFromCloudinary(existing.publicId).catch(() => {})
    }

    await existing.deleteOne()
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[announcements DELETE]', e)
    return NextResponse.json({ error: e.message || 'Delete failed.' }, { status: 500 })
  }
}
