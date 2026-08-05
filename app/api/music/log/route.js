import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import TrackActivity from '@/models/TrackActivity'
import 'server-only'

export const dynamic = 'force-dynamic'

// Log a play or download event.
// Only signed-in users are tracked; anonymous/guests are silently ignored so free streaming stays frictionless.
// Basic dedupe: same user + track + activityType in the last 5 minutes → skip (prevents double-count from pauses/retries).
export async function POST(req) {
  try {
    const session = await getSession()
    // Guests: don't track, but don't error — keeps free streaming smooth
    if (!session?.user?.email) {
      return NextResponse.json({ ok: true, tracked: false })
    }

    const data = await req.json().catch(() => ({}))
    const { trackId, trackTitle, artistName, activityType } = data

    if (!activityType || !['play', 'download'].includes(activityType)) {
      return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 })
    }

    await dbConnect()

    // Dedupe: ignore duplicate events within a 5-minute window for the same user/track/type
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
    const existing = await TrackActivity.findOne({
      userEmail: session.user.email.toLowerCase().trim(),
      trackId: trackId || null,
      activityType,
      createdAt: { $gte: fiveMinAgo },
    })
    if (existing) {
      return NextResponse.json({ ok: true, tracked: false, deduped: true })
    }

    await TrackActivity.create({
      trackId: trackId || null,
      trackTitle: (trackTitle || '').slice(0, 200),
      artistName: (artistName || '').slice(0, 200),
      activityType,
      userEmail: session.user.email.toLowerCase().trim(),
      userName: session.user.name || '',
    })

    return NextResponse.json({ ok: true, tracked: true })
  } catch (e) {
    // Never break the player on tracking errors
    console.error('[music/log] error:', e.message)
    return NextResponse.json({ ok: true, tracked: false })
  }
}
