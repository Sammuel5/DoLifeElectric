import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import { isDbDownError } from '@/lib/dbSafe'
import TrackActivity from '@/models/TrackActivity'
import 'server-only'

export const dynamic = 'force-dynamic'

function emptyPagination(page = 1, limit = 10) {
  return { page, limit, total: 0, totalPages: 1, hasMore: false }
}

// GET /api/music/activity — list track activity (paginated)
export async function GET(req) {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.allowed) return auth.error

    await dbConnect()
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '10')), 100)
    const type = searchParams.get('type') || 'all'
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
    if (isDbDownError(e)) {
      console.warn('[music/activity GET] DB down:', e.message.slice(0, 120))
      const { searchParams } = new URL(req.url)
      const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
      const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '10')), 100)
      return NextResponse.json({
        error: 'Database temporarily unavailable',
        dbDown: true,
        activities: [],
        pagination: emptyPagination(page, limit),
      }, { status: 503, headers: { 'x-db-down': '1' } })
    }
    return NextResponse.json({
      error: e.message,
      activities: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1, hasMore: false },
    }, { status: 500 })
  }
}
