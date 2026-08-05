import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import TrackActivity from '@/models/TrackActivity'
import 'server-only'

export const dynamic = 'force-dynamic'

// Parse YYYY-MM-DD as local-midnight Date (avoids UTC-shift bugs).
// Accepts both YYYY-MM-DD strings and ISO strings.
function parseLocalDate(s) {
  if (!s) return null
  if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d, 0, 0, 0, 0)
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

// Bulk delete music activity (owner only)
// Body:
//   { before: "YYYY-MM-DD" }   delete everything BEFORE (before start of that day = end of previous day)
//   { after: "YYYY-MM-DD" }    delete everything ON/AFTER start of that day
//   { before + after }         date range
//   { type: "play"|"download"} only delete that type (can combine with dates)
//   { all: true }              delete everything
//   { id: "..." }              single-record delete (from PUT below, DELETE also accepts it)
export async function DELETE(req) {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.allowed) return auth.error

    await dbConnect()
    const body = await req.json().catch(() => ({}))

    const hasFilter = body.all === true
      || body.before || body.after
      || body.type
      || body.id
      || (Array.isArray(body.ids) && body.ids.length > 0)

    if (!hasFilter) {
      return NextResponse.json({ error: 'No filter specified. Refusing to delete everything without explicit all:true.' }, { status: 400 })
    }

    const query = {}

    // Date range — interpret dates in server local time
    if (body.before || body.after) {
      query.createdAt = {}
      if (body.before) {
        const d = parseLocalDate(body.before)
        if (!d) return NextResponse.json({ error: 'Invalid "before" date' }, { status: 400 })
        query.createdAt.$lt = d
      }
      if (body.after) {
        const d = parseLocalDate(body.after)
        if (!d) return NextResponse.json({ error: 'Invalid "after" date' }, { status: 400 })
        query.createdAt.$gte = d
      }
    }

    if (body.type && ['play', 'download'].includes(body.type)) {
      query.activityType = body.type
    }

    if (body.id) {
      query._id = body.id
    } else if (Array.isArray(body.ids) && body.ids.length > 0) {
      query._id = { $in: body.ids }
    }

    const result = await TrackActivity.deleteMany(query)

    return NextResponse.json({
      ok: true,
      deletedCount: result.deletedCount,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Single-record delete (owner only)
export async function PUT(req) {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.allowed) return auth.error

    await dbConnect()
    const body = await req.json().catch(() => ({}))
    const { id } = body

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const result = await TrackActivity.findByIdAndDelete(id)
    if (!result) return NextResponse.json({ error: 'Record not found' }, { status: 404 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

