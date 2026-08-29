import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import Announcement from '@/models/Announcement'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/announcements/admin
 * ADMIN — list ALL announcements (active + inactive, past + future), newest first.
 */
export async function GET() {
  const auth = await requirePermission('announcements')
  if (!auth.allowed) return auth.error

  try {
    await dbConnect()
    const list = await Announcement.find({}).sort({ createdAt: -1 }).limit(200).lean()
    return NextResponse.json({
      announcements: list.map(a => ({
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
      })),
    })
  } catch (e) {
    console.error('[announcements admin GET]', e)
    return NextResponse.json({ error: e.message || 'Failed to list announcements.' }, { status: 500 })
  }
}
