import { NextResponse } from 'next/server'
import { requirePrimaryOwner, requireSuperAdmin, norm, SUPER_ADMIN } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import { isDbDownError } from '@/lib/dbSafe'
import Admin from '@/models/Admin'
export const dynamic = 'force-dynamic'

const DB_DOWN_HEADERS = { 'x-db-down': '1' }
const PAGE_SIZE = 5

function shape(a) {
  return {
    _id: String(a._id),
    email: a.email,
    name: a.name || '',
    role: a.role || 'admin',
    isPrimaryOwner: norm(a.email) === norm(SUPER_ADMIN),
    permissions: {
      music:     a.role === 'super' ? true : !!a.permissions?.music,
      artists:   a.role === 'super' ? true : a.permissions?.artists !== false,
      donations: a.role === 'super' ? true : !!a.permissions?.donations,
      analytics: a.role === 'super' ? true : !!a.permissions?.analytics,
    },
    addedBy: a.addedBy || '',
    createdAt: a.createdAt,
  }
}

// GET /api/admins — paginated list (5 per page).
// Accessible to ALL super admins (primary owner + promoted co-owners). The
// primary OWNER_EMAIL is always pinned to the top of page 1.
export async function GET(req) {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.allowed) return auth.error
    await dbConnect()

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const search = (searchParams.get('search') || '').trim()
    const searchQ = search ? search.toLowerCase() : ''
    const esc = searchQ ? searchQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : ''
    const searchRe = esc ? new RegExp(esc, 'i') : null
    const matchesSearch = (email, name) => {
      if (!searchRe) return true
      return searchRe.test(email || '') || searchRe.test(name || '')
    }

    // Non-primary-owner query (used for pagination count and list).
    const baseQuery = { email: { $ne: norm(SUPER_ADMIN) } }
    if (searchRe) baseQuery.$or = [{ email: searchRe }, { name: searchRe }]

    // Fetch primary owner record (if it exists).
    let owner = null
    if (process.env.OWNER_EMAIL || SUPER_ADMIN) {
      owner = await Admin.findOne({ email: norm(SUPER_ADMIN) }).lean()
    }

    const ownerMatches = owner && matchesSearch(owner.email, owner.name)
    const ownerCounted = owner && ownerMatches ? 1 : 0
    const ownerOnThisPage = page === 1 && ownerMatches

    const pageSize = PAGE_SIZE
    let othersLimit = pageSize
    let othersSkip = (page - 1) * pageSize
    if (ownerOnThisPage) {
      othersLimit = pageSize - 1
      othersSkip = 0
    } else if (ownerCounted) {
      othersSkip = (page - 1) * pageSize - 1
    }

    const [othersCount, others] = await Promise.all([
      Admin.countDocuments(baseQuery),
      Admin.find(baseQuery)
        .sort({ role: -1, createdAt: 1, _id: 1 }) // co-owners before regular admins
        .skip(Math.max(0, othersSkip))
        .limit(othersLimit)
        .lean(),
    ])

    const list = []
    if (ownerOnThisPage) list.push(owner)
    list.push(...others)

    const totalOthers = othersCount
    const total = totalOthers + ownerCounted
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    return NextResponse.json({
      admins: list.map(shape),
      pagination: {
        page,
        limit: PAGE_SIZE,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    })
  } catch (e) {
    if (isDbDownError(e)) {
      console.warn('[admins GET] DB down:', e.message.slice(0, 120))
      return NextResponse.json({ error: 'Database unavailable', dbDown: true }, { status: 503, headers: DB_DOWN_HEADERS })
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/admins — PRIMARY OWNER ONLY. Creates a new admin OR co-owner.
// Accepts role: 'admin' (default) or role: 'super' (promoted co-owner).
export async function POST(req) {
  try {
    const auth = await requirePrimaryOwner()
    if (!auth.allowed) return auth.error
    await dbConnect()
    const body = await req.json().catch(() => ({}))
    const email = (body.email || '').trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }
    if (email === auth.session.user.email.toLowerCase()) {
      return NextResponse.json({ error: 'That is your own (primary owner) account — already an owner.' }, { status: 400 })
    }
    if (email === norm(SUPER_ADMIN)) {
      return NextResponse.json({ error: 'The primary owner cannot be added.' }, { status: 400 })
    }

    const requestedRole = body.role === 'super' ? 'super' : 'admin'

    const existing = await Admin.findOne({ email })
    if (existing) return NextResponse.json({ error: 'That admin already exists.' }, { status: 409 })

    const admin = await Admin.create({
      email,
      name: body.name || email.split('@')[0],
      role: requestedRole,
      addedBy: auth.session.user.email,
      permissions: {
        music:     requestedRole === 'super' ? true : !!body.permissions?.music,
        artists:   requestedRole === 'super' ? true : (body.permissions?.artists !== false),
        donations: requestedRole === 'super' ? true : !!body.permissions?.donations,
        analytics: requestedRole === 'super' ? true : !!body.permissions?.analytics,
      },
    })

    return NextResponse.json(shape(admin))
  } catch (e) {
    if (isDbDownError(e)) {
      return NextResponse.json(
        { error: 'Database is currently unreachable. Wait a moment and try again, or run `node test-db.js` to diagnose.', dbDown: true },
        { status: 503, headers: DB_DOWN_HEADERS }
      )
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
