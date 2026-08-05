import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = ['pending', 'completed', 'failed', 'refunded']

async function getDonationModel() {
  const dbConnect = (await import('@/lib/dbConnect')).default
  await dbConnect()
  return (await import('@/models/Donation')).default
}

// PUT /api/donations/:id - Update a donation (status/message/note). OWNER ONLY.
export async function PUT(req, { params }) {
  console.log(`[donations/:id PUT] id=${params?.id}`)
  try {
    const auth = await requireSuperAdmin()
    if (!auth.allowed) {
      console.log(`[donations/:id PUT] AUTH DENIED:`, auth.error)
      return auth.error
    }

    const { id } = params
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid donation id: ' + id }, { status: 400 })
    }

    const Donation = await getDonationModel()
    const body = await req.json().catch(() => ({}))
    console.log(`[donations/:id PUT] body=`, body)

    const update = {}
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: `Invalid status "${body.status}". Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
      }
      update.status = body.status
    }
    if (body.message !== undefined) update.message = String(body.message).slice(0, 500)
    if (body.note !== undefined) update.note = String(body.note).slice(0, 500)

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const updated = await Donation.findByIdAndUpdate(id, update, { new: true })
    if (!updated) {
      console.log(`[donations/:id PUT] Not found id=${id}`)
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }
    console.log(`[donations/:id PUT] OK id=${id} -> status=${updated.status}`)
    return NextResponse.json(updated)
  } catch (e) {
    console.error('[donations/:id PUT] ERROR:', e)
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}

// DELETE /api/donations/:id - Delete a donation record. OWNER ONLY.
export async function DELETE(req, { params }) {
  console.log(`[donations/:id DELETE] id=${params?.id}`)
  try {
    const auth = await requireSuperAdmin()
    if (!auth.allowed) {
      console.log(`[donations/:id DELETE] AUTH DENIED`)
      return auth.error
    }

    const { id } = params
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid donation id: ' + id }, { status: 400 })
    }

    const Donation = await getDonationModel()
    const removed = await Donation.findByIdAndDelete(id)
    if (!removed) {
      console.log(`[donations/:id DELETE] Not found id=${id}`)
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }
    console.log(`[donations/:id DELETE] OK id=${id}`)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[donations/:id DELETE] ERROR:', e)
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
