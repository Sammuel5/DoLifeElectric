import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

async function getDonationModel() {
  const dbConnect = (await import('@/lib/dbConnect')).default
  await dbConnect()
  return (await import('@/models/Donation')).default
}

// POST /api/donations/bulk-delete
// Body: { ids: string[] }
// SUPER ADMIN / OWNER ONLY. Permanently deletes the listed donation records.
export async function POST(req) {
  console.log('[donations/bulk-delete] called')
  try {
    const auth = await requireSuperAdmin()
    if (!auth.allowed) {
      console.log('[donations/bulk-delete] AUTH DENIED')
      return auth.error
    }

    const body = await req.json().catch(() => ({}))
    const rawIds = Array.isArray(body?.ids) ? body.ids : []
    const ids = rawIds.filter(id => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id))

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No valid donation IDs provided' }, { status: 400 })
    }
    if (ids.length > 500) {
      return NextResponse.json({ error: 'Too many IDs — max 500 per request' }, { status: 400 })
    }

    console.log(`[donations/bulk-delete] deleting ${ids.length} records`)
    const Donation = await getDonationModel()
    const result = await Donation.deleteMany({ _id: { $in: ids } })
    console.log(`[donations/bulk-delete] OK: deleted=${result.deletedCount}`)

    return NextResponse.json({ ok: true, deleted: result.deletedCount || 0, requested: ids.length })
  } catch (e) {
    console.error('[donations/bulk-delete] ERROR:', e)
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
