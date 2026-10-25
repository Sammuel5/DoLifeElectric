import { NextResponse } from 'next/server'
import crypto from 'crypto'
import dbConnect from '@/lib/dbConnect'
import Donation from '@/models/Donation'
import { verifyPayPalWebhook, getPayPalOrder } from '@/lib/paypal'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/webhooks/paypal
 *
 * Receives PayPal webhook events (payment capture completed/denied/refunded).
 * PayPal signs the request — we verify by POSTing the headers+body back to
 * PayPal's /v1/notifications/verify-webhook-signature endpoint via verifyPayPalWebhook().
 *
 * Note: PayPal resource URLs in webhooks use the HATEOAS _links pattern, but
 * the easiest way to get the full order state is to re-fetch it by order ID
 * via the Orders API using the reference we stored.
 */
export async function POST(req) {
  try {
    await dbConnect()

    const arrBuf = await req.arrayBuffer()
    const rawBody = Buffer.from(arrBuf)

    const headers = {
      'paypal-auth-algo': req.headers.get('paypal-auth-algo') || '',
      'paypal-cert-url': req.headers.get('paypal-cert-url') || '',
      'paypal-transmission-id': req.headers.get('paypal-transmission-id') || '',
      'paypal-transmission-sig': req.headers.get('paypal-transmission-sig') || '',
      'paypal-transmission-time': req.headers.get('paypal-transmission-time') || '',
    }

    let event
    try { event = JSON.parse(rawBody.toString('utf8')) } catch (_) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const eventType = event?.event_type
    const resource = event?.resource || {}
    const resourceType = event?.resource_type

    console.log('[paypal-webhook] received event:', eventType, 'resource_type:', resourceType, 'id:', resource?.id || '(none)')

    const verified = await verifyPayPalWebhook({ headers, rawBody })
    if (!verified) {
      console.warn('[paypal-webhook] INVALID SIGNATURE. event:', eventType)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Find the matching donation
    let donation = null

    // Strategy 1: resource has a custom_id (we set this to dle_<donationId>)
    //   - For PAYMENT.CAPTURE.COMPLETED, resource is a "capture" object which
    //     has custom_id on the purchase_unit up one level; webhook resource is
    //     the capture itself, so we use supplementary_data.related_ids.order_id
    //     and look up by paypalOrderId.
    const customId =
      resource?.custom_id ||
      resource?.supplementary_data?.related_ids?.order_id ||
      null

    if (customId && typeof customId === 'string' && customId.startsWith('dle_')) {
      const id = customId.replace(/^dle_/, '')
      if (mongooseValidId(id)) {
        donation = await Donation.findById(id)
      }
    }

    // Strategy 2: look up by order id (present in capture objects)
    if (!donation) {
      const orderId =
        resource?.supplementary_data?.related_ids?.order_id ||
        resource?.id  // for CHECKOUT.ORDER.APPROVED events
      if (orderId) {
        donation = await Donation.findOne({ paypalOrderId: orderId })
      }
    }

    // Strategy 3: look up by capture/payment id
    if (!donation && resource?.id && (eventType || '').startsWith('PAYMENT.CAPTURE')) {
      donation = await Donation.findOne({ paypalPaymentId: resource.id })
    }

    if (!donation) {
      // For capture events we can try to refetch the order by looking for pending paypal donations with matching amount/time
      console.warn('[paypal-webhook] could not match donation for event:', eventType)
      return NextResponse.json({ received: true, warning: 'no matching donation' })
    }

    console.log('[paypal-webhook] matched donation', donation._id.toString(), 'current status:', donation.status, '->', eventType)

    // Ask PayPal for the authoritative order state instead of trusting the
    // webhook snapshot (captures can be partial, refunds can reference
    // different resources, etc.).
    if (donation.paypalOrderId) {
      try {
        const order = await getPayPalOrder(donation.paypalOrderId)
        if (order) {
          if (order.status === 'paid' && donation.status !== 'completed') {
            donation.status = 'completed'
            if (order.amount) donation.amount = order.amount
            if (order.paymentId) donation.paypalPaymentId = order.paymentId
            donation.paidAt = order.paidAt ? new Date(order.paidAt * 1000) : new Date()
            donation.paymentMethod = 'paypal'
            donation.metadata = {
              ...(donation.metadata || {}),
              order_id: order.orderId,
              payment_id: order.paymentId,
              payer_email: order.payerEmail,
              payer_name: order.payerName,
              fee_centavos: order.fee,
              net_amount_centavos: order.netAmount,
              synced_by: 'paypal-webhook',
            }
            await donation.save()
            console.log('[paypal-webhook] marked donation', donation._id.toString(), 'COMPLETED')
          } else if (order.status === 'failed' && donation.status !== 'failed' && donation.status !== 'completed') {
            donation.status = 'failed'
            await donation.save()
          } else if (order.status === 'refunded' && donation.status !== 'refunded') {
            donation.status = 'refunded'
            await donation.save()
          }
          return NextResponse.json({ received: true })
        }
      } catch (e) {
        console.warn('[paypal-webhook] order re-fetch failed; applying webhook snapshot directly:', e.message)
      }
    }

    // Fallback: apply status directly from webhook event
    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED': {
        if (donation.status !== 'completed') {
          donation.status = 'completed'
          if (resource?.amount?.value) {
            donation.amount = Math.round(Number(resource.amount.value) * 100)
          }
          donation.paypalPaymentId = resource.id || donation.paypalPaymentId
          donation.paidAt = resource.create_time ? new Date(resource.create_time) : new Date()
          donation.paymentMethod = 'paypal'
          await donation.save()
          console.log('[paypal-webhook] (snapshot) marked donation', donation._id.toString(), 'COMPLETED')
        }
        break
      }
      case 'PAYMENT.CAPTURE.DENIED': {
        if (donation.status !== 'completed') {
          donation.status = 'failed'
          await donation.save()
        }
        break
      }
      case 'PAYMENT.CAPTURE.REFUNDED': {
        donation.status = 'refunded'
        await donation.save()
        break
      }
      default:
        console.log('[paypal-webhook] unhandled event type:', eventType)
    }

    return NextResponse.json({ received: true })
  } catch (e) {
    console.error('[paypal-webhook] error:', e)
    return NextResponse.json({ received: true })
  }
}

function mongooseValidId(id) {
  try {
    return /^[0-9a-fA-F]{24}$/.test(id)
  } catch { return false }
}
