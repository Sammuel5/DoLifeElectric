import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isOwnerEmail, SUPER_ADMIN, resolveAdminRecord, norm, mergePerms } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import Donation from '@/models/Donation'

export const dynamic = 'force-dynamic'

function canViewDonations(session) {
  if (!session?.user?.email) return false
  const email = norm(session.user.email)
  if (email === norm(SUPER_ADMIN) || session.user.isSuperAdmin) return true
  if (session.user.permissions?.donations) return true
  return false
}

// GET /api/donations — list donations (with pagination)
// Query params:
//   page: 1-based page number (default 1)
//   limit: items per page (default 20, max 100)
//   status: filter by status (optional)
//   search: search by user name / email / artist name / reference / payment id (optional)
// Returns: { donations: [], pagination: { page, limit, total, totalPages, hasMore } }
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await dbConnect()

    const userEmail = norm(session.user.email)
    const isSuper = isOwnerEmail(userEmail) || session.user.adminRole === 'super'
    const canSeeAll = isSuper || canViewDonations(session)

    if (!canSeeAll) {
      return NextResponse.json({ donations: [], pagination: emptyPagination() })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '10')), 100)
    const status = searchParams.get('status') || ''
    const search = (searchParams.get('search') || '').trim()

    const query = {}
    if (status && status !== 'all') query.status = status

    if (search) {
      const q = search.toLowerCase()
      const mongoose = await import('mongoose')
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      query.$or = [
        { userName: regex },
        { userEmail: regex },
        { artistName: regex },
        { message: regex },
        { paymongoReferenceNo: regex },
        { paymongoPaymentId: regex },
        { paymongoLinkId: regex },
      ]
    }

    const skip = (page - 1) * limit
    const [donations, total] = await Promise.all([
      Donation.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Donation.countDocuments(query),
    ])

    const totalPages = Math.max(1, Math.ceil(total / limit))

    return NextResponse.json({
      donations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    }, {
      headers: { 'x-user-role': isSuper ? 'super' : 'admin' },
    })
  } catch (e) {
    console.error('[donations GET] error:', e)
    return NextResponse.json({ error: e.message, donations: [], pagination: emptyPagination() }, { status: 500 })
  }
}

function emptyPagination() {
  return { page: 1, limit: 10, total: 0, totalPages: 1, hasMore: false }
}
