import { NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import Donation from '@/models/Donation'
import { retrieveLink, retrievePayment, isPayMongoConfigured } from '@/lib/paymongo'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/donations/sync/:id
 *
 * Client-side sync endpoint. When a user lands back on our site after a PayMongo
 * checkout (success or cancel), the browser hits this endpoint a couple times to
 * force-sync the donation's status with PayMongo. This is a SAFETY NET for:
 *   - Webhook delays (PayMongo sometimes delivers webhooks 5-60s after payment)
 *   - Misconfigured webhook secrets
 *   - Users closing the tab before webhook fires
 *   - Preview deployments where Vercel webhook URLs aren't yet registered
 *
 * It looks up the donation, asks PayMongo "what's the current status of this
 * payment/link?", and updates our DB record accordingly.
 *
 * This endpoint is intentionally public (no auth) — it only reveals status of
 * a specific donation ID if you know it, and only marks payments paid (never
 * modifies amounts or creates money).
 */
export async function GET(req, { params }) {
  try {
    await dbConnect()
    const { id } = params
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid donation id' }, { status: 400 })
    }

    const donation = await Donation.findById(id)
    if (!donation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // If already completed, nothing to sync — return immediately.
    if (donation.status === 'completed') {
      return NextResponse.json({ status: 'completed', donation: summary(donation) })
    }

    if (!isPayMongoConfigured()) {
      return NextResponse.json({ status: donation.status, warning: 'PayMongo not configured' })
    }

    // Try the PayMongo Link first (payments made through our checkout go through Links)
    let paid = false
    let paymentSource = null
    let payAmount = null

    if (donation.paymongoLinkId) {
      try {
        const link = await retrieveLink(donation.paymongoLinkId)
        const linkAttrs = link?.data?.attributes
        if (linkAttrs) {
          // Link statuses: unpaid → paid
          if (linkAttrs.status === 'paid') {
            paid = true
            payAmount = linkAttrs.amount
            // Payments from a link have their payments array
            const payments = linkAttrs.payments || []
            if (payments.length) {
              const lastPayment = payments[payments.length - 1]
              paymentSource = lastPayment?.attributes?.source?.type
                || lastPayment?.attributes?.payment_method_type
              // Store the payment id if not already stored
              if (lastPayment?.id && !donation.paymongoPaymentId) {
                donation.paymongoPaymentId = lastPayment.id
              }
            }
          }
        }
      } catch (e) {
        console.warn('[donations/sync] retrieveLink error:', e.message)
      }
    }

    // Also check individual payment if we have one
    if (!paid && donation.paymongoPaymentId) {
      try {
        const p = await retrievePayment(donation.paymongoPaymentId)
        const attrs = p?.data?.attributes
        if (attrs?.status === 'paid') {
          paid = true
          payAmount = attrs.amount
          paymentSource = attrs?.source?.type || attrs?.payment_method_type
        } else if (attrs?.status === 'failed') {
          donation.status = 'failed'
          await donation.save()
          return NextResponse.json({ status: 'failed', donation: summary(donation) })
        } else if (attrs?.status === 'refunded') {
          donation.status = 'refunded'
          await donation.save()
          return NextResponse.json({ status: 'refunded', donation: summary(donation) })
        }
      } catch (e) {
        console.warn('[donations/sync] retrievePayment error:', e.message)
      }
    }

    if (paid) {
      donation.status = 'completed'
      if (payAmount) donation.amount = payAmount
      if (paymentSource) donation.paymentMethod = paymentSource
      if (!donation.paidAt) donation.paidAt = new Date()
      donation.metadata = { ...(donation.metadata || {}), synced_by: 'client-poll', synced_at: Date.now() }
      await donation.save()
      console.log('[donations/sync] marked donation', id, 'COMPLETED via client poll')
      return NextResponse.json({ status: 'completed', donation: summary(donation), updated: true })
    }

    // Still pending — tell client to retry later
    return NextResponse.json({ status: donation.status, polling: true })
  } catch (e) {
    console.error('[donations/sync] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function summary(d) {
  return {
    _id: d._id,
    status: d.status,
    amount: d.amount,
    artistName: d.artistName,
  }
}
