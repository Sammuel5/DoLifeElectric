import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isOwnerEmail, SUPER_ADMIN, norm } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import Donation from '@/models/Donation'
import { retrieveResource, interpretResource, isPayMongoConfigured } from '@/lib/paymongo'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/donations/reconcile
 * Admin-only. Asks PayMongo about recent pending donations and updates their
 * status. Useful when webhooks fail (wrong secret, timeout, etc.) so the admin
 * page doesn't show stale "pending" for payments that actually went through.
 *
 * Query: ?maxAgeHours=48&limit=50  (defaults shown)
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const email = norm(session.user.email)
    const isOwner = isOwnerEmail(email) || email === norm(SUPER_ADMIN) || session.user.isSuperAdmin
    const canDonate = isOwner || session.user.permissions?.donations
    if (!canDonate) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (!isPayMongoConfigured()) {
      return NextResponse.json({ error: 'PayMongo not configured' }, { status: 503 })
    }

    await dbConnect()

    const { searchParams } = new URL(req.url)
    const maxAgeHours = Math.min(Math.max(1, parseInt(searchParams.get('maxAgeHours') || '72')), 24 * 30)
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50')), 200)

    const since = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000)

    const pending = await Donation.find({
      provider: 'paymongo',
      status: 'pending',
      createdAt: { $gte: since },
      $or: [
        { paymongoLinkId: { $ne: '' } },
        { paymongoPaymentId: { $ne: '' } },
      ],
    }).sort({ createdAt: -1 }).limit(limit)

    const result = { checked: 0, completed: 0, failed: 0, stillPending: 0, errors: [] }

    for (const d of pending) {
      result.checked++
      try {
        const candidates = [d.paymongoPaymentId, d.paymongoLinkId].filter(Boolean)
        let info = null
        for (const rid of candidates) {
          const res = await retrieveResource(rid)
          info = interpretResource(res)
          if (info && info.status !== 'pending') break
        }
        if (!info) { result.stillPending++; continue }

        let changed = false
        if (info.status === 'paid') {
          d.status = 'completed'
          if (info.amount) d.amount = info.amount
          if (info.paymentId) d.paymongoPaymentId = info.paymentId
          if (info.paymentSource) d.paymentMethod = info.paymentSource
          d.paidAt = info.paidAt ? new Date(info.paidAt * 1000) : new Date()
          d.metadata = {
            ...(d.metadata || {}),
            payment_id: info.paymentId,
            payment_source: info.paymentSource,
            fee: info.fee,
            net_amount: info.netAmount,
            synced_by: 'reconcile',
            last_synced_at: Date.now(),
          }
          changed = true
          result.completed++
        } else if (info.status === 'failed') {
          d.status = 'failed'
          d.metadata = { ...(d.metadata || {}), failed_at: Date.now(), last_synced_at: Date.now() }
          changed = true
          result.failed++
        } else if (info.status === 'refunded') {
          d.status = 'refunded'
          changed = true
        } else {
          result.stillPending++
        }

        if (changed) await d.save()
      } catch (err) {
        result.errors.push({ id: d._id.toString(), error: err.message })
      }
    }

    return NextResponse.json(result)
  } catch (e) {
    console.error('[donations/reconcile] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
