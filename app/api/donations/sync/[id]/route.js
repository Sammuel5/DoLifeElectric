import { NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import Donation from '@/models/Donation'
import { retrieveResource, interpretResource, isPayMongoConfigured } from '@/lib/paymongo'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/donations/sync/:id
 *
 * Client/server-side sync endpoint. Asks PayMongo for the current state of
 * the checkout session / payment and updates our DB record accordingly.
 * Used by:
 *   - Homepage success toast (client poll, safety net for webhook delays)
 *   - Admin "sync" buttons (manual reconciliation)
 *   - Admin page "auto-reconcile pending" batch job
 *
 * Public (no auth) but only reveals/mutates status of the specific donation
 * id you pass — never modifies amounts or creates money.
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

    // Already in a terminal state that doesn't need re-checking
    if (donation.status === 'refunded') {
      return NextResponse.json({ status: 'refunded', donation: summary(donation) })
    }

    if (!isPayMongoConfigured()) {
      return NextResponse.json({ status: donation.status, warning: 'PayMongo not configured' })
    }

    // Try to fetch the resource from PayMongo using whatever id we have.
    // Preference: paymongoPaymentId (pay_xxx, most authoritative)
    //            paymongoLinkId (cs_xxx or link_xxx)
    const candidates = [donation.paymongoPaymentId, donation.paymongoLinkId].filter(Boolean)
    let info = null
    for (const rid of candidates) {
      const res = await retrieveResource(rid)
      info = interpretResource(res)
      if (info && info.status !== 'pending') break
    }

    if (!info) {
      // Couldn't reach PayMongo or the resource doesn't exist yet
      return NextResponse.json({ status: donation.status, polling: true })
    }

    let changed = false

    const applyPaid = () => {
      if (donation.status !== 'completed') {
        donation.status = 'completed'
        changed = true
      }
      if (info.amount && donation.amount !== info.amount) {
        donation.amount = info.amount
        changed = true
      }
      if (info.paymentId && info.paymentId !== donation.paymongoPaymentId) {
        donation.paymongoPaymentId = info.paymentId
        changed = true
      }
      if (info.paymentSource && info.paymentSource !== donation.paymentMethod) {
        donation.paymentMethod = info.paymentSource
        changed = true
      }
      if (!donation.paidAt) {
        donation.paidAt = info.paidAt ? new Date(info.paidAt * 1000) : new Date()
        changed = true
      }
      donation.metadata = {
        ...(donation.metadata || {}),
        payment_id: info.paymentId || donation.paymongoPaymentId,
        payment_source: info.paymentSource,
        fee: info.fee,
        net_amount: info.netAmount,
        synced_by: (donation.metadata?.synced_by) || 'sync-endpoint',
        last_synced_at: Date.now(),
      }
    }

    if (info.status === 'paid') {
      applyPaid()
    } else if (info.status === 'failed' && donation.status !== 'failed' && donation.status !== 'completed') {
      donation.status = 'failed'
      donation.metadata = {
        ...(donation.metadata || {}),
        failed_at: Date.now(),
        last_synced_at: Date.now(),
      }
      changed = true
    } else if (info.status === 'refunded' && donation.status !== 'refunded') {
      donation.status = 'refunded'
      donation.metadata = { ...(donation.metadata || {}), refunded_at: Date.now(), last_synced_at: Date.now() }
      changed = true
    } else if (info.status === 'expired' && donation.status === 'pending') {
      // Expired sessions (customer never paid) stay pending from an admin
      // standpoint but we record that the session is no longer active.
      donation.metadata = {
        ...(donation.metadata || {}),
        expired: true,
        last_synced_at: Date.now(),
      }
      changed = true
    } else {
      // Still pending — just touch the sync timestamp
      donation.metadata = { ...(donation.metadata || {}), last_synced_at: Date.now() }
      changed = true
    }

    if (changed) await donation.save()

    return NextResponse.json({
      status: donation.status,
      donation: summary(donation),
      remoteStatus: info.status,
      updated: changed,
    })
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
    userName: d.userName,
    paymentMethod: d.paymentMethod,
  }
}
