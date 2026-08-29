import { NextResponse } from 'next/server'
import { getSession, requirePermission } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import Announcement from '@/models/Announcement'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/announcements
 *
 * PUBLIC — returns the currently-active announcement that should be shown to
 * visitors right now. Picks the most-recently-updated active announcement
 * whose schedule window includes the current time.
 *
 * Also increments the `views` counter (best-effort; we don't fail the request
 * if the increment races).
 *
 * Auth: NOT required. Anyone visiting the site can see what's up.
 */
export async function GET(req) {
  try {
    await dbConnect()
    const now = new Date()

    // Find all active announcements, then pick the one whose window covers "now".
    // We do the date filtering in-memory (with an indexed `active` query) to
    // keep it robust against null startsAt/endsAt semantics.
    const candidates = await Announcement.find({ active: true })
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean()

    const visible = candidates.find(a => {
      if (a.startsAt && new Date(a.startsAt) > now) return false
      if (a.endsAt && new Date(a.endsAt) < now) return false
      return true
    })

    if (!visible) {
      return NextResponse.json({ announcement: null })
    }

    // Best-effort view count bump (don't await — don't delay response)
    Announcement.updateOne({ _id: visible._id }, { $inc: { views: 1 } }).catch(() => {})

    return NextResponse.json({
      announcement: {
        id: visible._id.toString(),
        title: visible.title,
        message: visible.message || '',
        type: visible.type,
        effect: visible.effect || 'none',
        mediaUrl: visible.mediaUrl,
        durationSec: visible.durationSec || 8,
        showOncePerUser: visible.showOncePerUser !== false,
        startsAt: visible.startsAt,
        endsAt: visible.endsAt,
      },
    })
  } catch (e) {
    console.error('[announcements GET]', e)
    // Don't break the homepage if DB is down — just return nothing.
    return NextResponse.json({ announcement: null })
  }
}

/**
 * POST /api/announcements
 *
 * ADMIN — create a new announcement. Requires `announcements` permission
 * (granted to super owners automatically).
 */
export async function POST(req) {
  const auth = await requirePermission('announcements')
  if (!auth.allowed) return auth.error

  try {
    await dbConnect()
    const body = await req.json().catch(() => ({}))
    const {
      title,
      message = '',
      type = 'image',
      effect = 'none',
      mediaUrl,
      publicId = '',
      durationSec = 8,
      startsAt = null,
      endsAt = null,
      active = true,
      showOncePerUser = true,
    } = body || {}

    if (!title || !title.trim()) return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
    if (!mediaUrl) return NextResponse.json({ error: 'mediaUrl is required. Upload an image or video first.' }, { status: 400 })
    if (!['image', 'video'].includes(type)) return NextResponse.json({ error: 'type must be "image" or "video".' }, { status: 400 })
    if (!['none', 'fireworks', 'balloons'].includes(effect)) return NextResponse.json({ error: 'Invalid effect.' }, { status: 400 })

    const dur = Number(durationSec)
    if (isNaN(dur) || dur < 3 || dur > 120) return NextResponse.json({ error: 'Duration must be 3–120 seconds.' }, { status: 400 })

    const doc = await Announcement.create({
      title: title.trim().slice(0, 120),
      message: (message || '').toString().trim().slice(0, 400),
      type,
      effect,
      mediaUrl,
      publicId: publicId || '',
      durationSec: dur,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      active: !!active,
      showOncePerUser: showOncePerUser !== false,
      createdBy: auth.session?.user?.email || '',
    })

    return NextResponse.json({ ok: true, announcement: serializeAnnouncement(doc) })
  } catch (e) {
    console.error('[announcements POST]', e)
    return NextResponse.json({ error: e.message || 'Failed to create announcement.' }, { status: 500 })
  }
}

function serializeAnnouncement(a) {
  return {
    id: a._id.toString(),
    title: a.title,
    message: a.message || '',
    type: a.type,
    effect: a.effect || 'none',
    mediaUrl: a.mediaUrl,
    publicId: a.publicId || '',
    durationSec: a.durationSec || 8,
    startsAt: a.startsAt,
    endsAt: a.endsAt,
    active: !!a.active,
    showOncePerUser: a.showOncePerUser !== false,
    views: a.views || 0,
    skips: a.skips || 0,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    createdBy: a.createdBy || '',
  }
}
