import { NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import Donation from '@/models/Donation'
import { getPayPalOrder, isPayPalConfigured } from '@/lib/paypal'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/paypal/sync/:donationId
 *
 * Client/server sync for PayPal donations — same role as /api/donations/sync/:id
 * for PayMongo. Asks PayPal for the current order state and updates our DB.
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

    if (donation.status === 'completed' || donation.status === 'refunded') {
      return NextResponse.json({ status: donation.status })
    }

    if (!isPayPalConfigured()) {
      return NextResponse.json({ status: donation.status, warning: 'PayPal not configured' })
    }

    const orderId = donation.paypalOrderId
    if (!orderId) {
      return NextResponse.json({ status: donation.status })
    }

    const order = await getPayPalOrder(orderId)
    if (!order) return NextResponse.json({ status: donation.status, polling: true })

    let changed = false
    if (order.status === 'paid' && donation.status !== 'completed') {
      donation.status = 'completed'
      donation.amount = order.amount || donation.amount
      donation.paypalPaymentId = order.paymentId
      donation.paymentMethod = 'paypal'
      donation.paidAt = order.paidAt ? new Date(order.paidAt * 1000) : new Date()
      donation.metadata = {
        ...(donation.metadata || {}),
        order_id: order.orderId,
        payment_id: order.paymentId,
        payer_email: order.payerEmail,
        payer_name: order.payerName,
        fee_centavos: order.fee,
        net_amount_centavos: order.netAmount,
        synced_by: 'paypal-sync',
        last_synced_at: Date.now(),
      }
      changed = true
    } else if (order.status === 'failed' && donation.status !== 'failed' && donation.status !== 'completed') {
      donation.status = 'failed'
      changed = true
    } else if (order.status === 'refunded' && donation.status !== 'refunded') {
      donation.status = 'refunded'
      changed = true
    }

    if (changed) await donation.save()

    return NextResponse.json({ status: donation.status, remoteStatus: order.status, updated: changed })
  } catch (e) {
    console.error('[paypal sync] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
