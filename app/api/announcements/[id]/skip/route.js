import { NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import Announcement from '@/models/Announcement'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/announcements/:id/skip
 * PUBLIC — increments the skip counter when a user clicks Skip.
 * Called fire-and-forget from the popup — never blocks the UI.
 */
export async function POST(_req, { params }) {
  try {
    await dbConnect()
    await Announcement.updateOne({ _id: params.id }, { $inc: { skips: 1 } })
    return NextResponse.json({ ok: true })
  } catch (_) {
    return NextResponse.json({ ok: true }) // silent fail
  }
}
