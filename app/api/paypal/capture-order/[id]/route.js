import { NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import Donation from '@/models/Donation'
import { capturePayPalOrder, isPayPalConfigured } from '@/lib/paypal'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/paypal/capture-order/:donationId
 *
 * Client calls this after the PayPal popup returns an approved orderID.
 * We ask PayPal to finalize the payment (capture), then update the donation
 * record. Returns the updated donation + thank-you metadata so the client can
 * fire the ThankYouModal.
 */
export async function POST(req, { params }) {
  try {
    const { id: donationId } = params

    await dbConnect()

    if (!isPayPalConfigured()) {
      return NextResponse.json({ error: 'PayPal not configured' }, { status: 503 })
    }

    if (!donationId || !mongoose.Types.ObjectId.isValid(donationId)) {
      return NextResponse.json({ error: 'Invalid donation id' }, { status: 400 })
    }

    const donation = await Donation.findById(donationId)
    if (!donation) return NextResponse.json({ error: 'Donation not found' }, { status: 404 })

    if (donation.status === 'completed') {
      return NextResponse.json({ status: 'completed', donationId })
    }

    // Expect the client to send us the orderId (matches what we created earlier)
    const body = await req.json().catch(() => ({}))
    const orderId = body.orderId || donation.paypalOrderId

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    const captured = await capturePayPalOrder(orderId)

    if (captured.status === 'paid') {
      donation.status = 'completed'
      donation.amount = captured.amount || donation.amount
      donation.paypalPaymentId = captured.paymentId
      donation.paymentMethod = 'paypal'
      donation.paidAt = captured.paidAt ? new Date(captured.paidAt * 1000) : new Date()
      donation.metadata = {
        ...(donation.metadata || {}),
        order_id: captured.orderId,
        payment_id: captured.paymentId,
        payer_email: captured.payerEmail,
        payer_name: captured.payerName,
        fee_centavos: captured.fee,
        net_amount_centavos: captured.netAmount,
        synced_by: 'capture-order',
      }
      await donation.save()
      console.log('[paypal] captured & marked donation', donation._id.toString(), 'COMPLETED')
      return NextResponse.json({
        status: 'completed',
        donationId: donation._id.toString(),
        artist: {
          name: donation.artistName,
          isGroup: donation.metadata?.artistIsGroup || false,
          image: donation.metadata?.artistImage || '',
        },
        giftType: donation.giftType,
      })
    }

    if (captured.status === 'failed') {
      donation.status = 'failed'
      donation.metadata = { ...(donation.metadata || {}), failed_at: Date.now() }
      await donation.save()
      return NextResponse.json({ status: 'failed', error: 'Payment was declined by PayPal.' }, { status: 402 })
    }

    return NextResponse.json({ status: captured.status || 'pending' })
  } catch (e) {
    console.error('[paypal capture-order] error:', e)
    return NextResponse.json({ error: e.message || 'Capture failed' }, { status: 500 })
  }
}
