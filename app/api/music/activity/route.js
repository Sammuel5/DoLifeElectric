import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import TrackActivity from '@/models/TrackActivity'
import 'server-only'

export const dynamic = 'force-dynamic'

// GET /api/music/activity — list track activity (paginated)
// Query params:
//   page:     1-based page number (default 1)
//   limit:    items per page (default 10, max 100)
//   type:     play | download | all (default all)
//   search:   search by user name / email / track title / artist name (optional)
// Returns:  { activities: [], pagination: { page, limit, total, totalPages, hasMore } }
export async function GET(req) {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.allowed) return auth.error

    await dbConnect()
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '10')), 100)
    const type = searchParams.get('type') || 'all' // play | download | all
    const search = (searchParams.get('search') || '').trim()

    const query = {}
    if (type === 'play' || type === 'download') query.activityType = type

    if (search) {
      const q = search.toLowerCase()
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      query.$or = [
        { userName: regex },
        { userEmail: regex },
        { trackTitle: regex },
        { artistName: regex },
      ]
    }

    const skip = (page - 1) * limit
    const [activities, total] = await Promise.all([
      TrackActivity.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      TrackActivity.countDocuments(query),
    ])

    const totalPages = Math.max(1, Math.ceil(total / limit))

    return NextResponse.json({
      activities,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    })
  } catch (e) {
    return NextResponse.json({
      error: e.message,
      activities: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1, hasMore: false },
    }, { status: 500 })
  }
}
