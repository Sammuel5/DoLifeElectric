import { NextResponse } from 'next/server'
import crypto from 'crypto'
import dbConnect from '@/lib/dbConnect'
import Donation from '@/models/Donation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET

/**
 * Verify PayMongo webhook signature.
 *
 * PayMongo uses a Stripe-inspired signed-header scheme. Over time they've
 * shipped multiple variants, all of which we accept here:
 *   v1 (old docs):   bare 64-char hex HMAC-SHA256(secret, body)
 *   v2 (Stripe-like): "t=<ts>,s=<hex>"   where s = HMAC(secret, "<ts>." + body)
 *   v3 (current):    "t=<ts>,te=<mode>,li=<hex>"   where li = HMAC(secret, "<ts>." + body)
 *                    ("te" is empty for test mode, "live" for live; "li" = live signature)
 * We try every signature-looking key we see (s/li/v1) against both payload
 * schemes (raw body vs t+body), and accept if any matches.
 */
function verifySignature(rawBody, signatureHeader) {
  if (!WEBHOOK_SECRET) return true // accept all if secret not configured (local dev)
  if (!signatureHeader) return false
  try {
    const header = signatureHeader.trim()

    // Bare hex form (v1): 64 hex chars with no commas or =
    if (/^[0-9a-fA-F]{64}$/.test(header)) {
      const sigBuf = Buffer.from(header, 'hex')
      const expBuf = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest()
      if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) return true
    }

    // Keyed form (v2/v3): parse all k=v pairs, then test each sig-looking value
    const kv = {}
    header.split(',').forEach(part => {
      const eq = part.indexOf('=')
      if (eq > 0) kv[part.slice(0, eq).trim()] = part.slice(eq + 1).trim()
    })
    const timestamp = kv.t || null
    // Try any key that could hold a signature — PayMongo has used s, li, v1, v0 across versions.
    const sigKeys = Object.keys(kv).filter(k => /^(s|li|v\d+|sig|sign(ature)?)$/i.test(k))
    if (sigKeys.length === 0) {
      console.error('[paymongo-webhook] could not find signature key in header. Keys found:', Object.keys(kv),
        'header:', header.slice(0, 100))
      return false
    }

    // Payloads to try: just body (v1), and t+body (v2/v3) when we have a timestamp
    const payloads = [rawBody]
    if (timestamp) payloads.push(Buffer.concat([Buffer.from(timestamp + '.'), rawBody]))

    for (const key of sigKeys) {
      const sigHex = kv[key]
      const sigBuf = Buffer.from(sigHex, 'hex')
      if (sigBuf.length !== 32) continue
      for (const payload of payloads) {
        const expBuf = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest()
        if (expBuf.length === sigBuf.length && crypto.timingSafeEqual(expBuf, sigBuf)) {
          return true
        }
      }
    }

    console.error('[paymongo-webhook] signature mismatch. Header keys:', Object.keys(kv),
      'timestamp:', timestamp,
      'tried sig keys:', sigKeys,
      'secret length:', WEBHOOK_SECRET.length,
      '(make sure PAYMONGO_WEBHOOK_SECRET starts with whsk_ and matches PayMongo Dashboard → Developers → Webhooks for URL https://dle-entertainment.com/api/webhooks/paymongo)')
    return false
  } catch (e) {
    console.error('[paymongo-webhook] signature verify error:', e.message)
    return false
  }
}

/**
 * Given a PayMongo event payload, try to find the matching Donation document.
 * We try several lookup strategies because PayMongo puts our reference_number
 * in different places depending on the event type (payment.paid vs link.payment.paid)
 * and payment method (card, gcash, qrph, etc.).
 */
async function findDonation(eventData) {
  const attrs = eventData?.attributes || {}
  const paymentId = eventData.id

  // Strategy 1: Our own reference number prefixed "dle_<donationId>"
  // It can show up in several places depending on event type:
  //   - For link.payment.paid: attributes.data.attributes.reference_number
  //   - For payment.paid:      attributes.description (we set referenceNumber in the link)
  //                            or attributes.metadata.pm_reference_number
  //                            or attributes.external_reference_number
  //                            or attributes.statement_descriptor
  // Links also have a top-level reference_number on the link resource.
  const candidates = [
    attrs?.reference_number,
    attrs?.metadata?.pm_reference_number,
    attrs?.external_reference_number,
    attrs?.statement_descriptor,
    attrs?.billing?.reference_number,
    // For link.payment.paid, the "data" attribute contains the payment;
    // the link's reference_number is one level up in the event wrapper.
    attrs?.data?.attributes?.reference_number,
  ].filter(Boolean)

  // PayMongo links have a checkout URL that contains the link id — we stored paymongoLinkId
  const linkId = attrs?.link?.id || attrs?.paymongo_link_id || attrs?.metadata?.link_id

  for (const ref of candidates) {
    if (typeof ref === 'string' && ref.startsWith('dle_')) {
      const id = ref.replace(/^dle_/, '')
      const mongoose = await import('mongoose')
      if (mongoose.default.Types.ObjectId.isValid(id)) {
        const d = await Donation.findById(id)
        if (d) return d
      }
    }
  }

  // Strategy 2: Look up by PayMongo link ID we stored on donation creation
  if (linkId) {
    const d = await Donation.findOne({ paymongoLinkId: linkId })
    if (d) return d
  }

  // Strategy 3: Look up by PayMongo payment ID (from metadata we set or from field)
  if (paymentId) {
    const d = await Donation.findOne({
      $or: [
        { paymongoPaymentId: paymentId },
        { 'metadata.payment_id': paymentId },
        { stripePaymentIntentId: paymentId },
      ],
    })
    if (d) return d
  }

  // Strategy 4: Check metadata.reference_number (we stored it at create time)
  const refNo = attrs?.metadata?.reference_number || attrs?.reference_number
  if (refNo) {
    const d = await Donation.findOne({ paymongoReferenceNo: refNo })
    if (d) return d
    // Try inside metadata map too
    const d2 = await Donation.findOne({ 'metadata.reference_number': refNo })
    if (d2) return d2
  }

  // Strategy 5: Last resort — if we get a payment.paid event with amount matching
  // and we can see it's a PayMongo payment, look at recent pending donations within
  // 5% of the same amount and mark the most recent one. This is a safety net.
  const amount = attrs?.amount
  if (amount && eventType && eventType.includes('paid')) {
    const tolerance = Math.round(amount * 0.05)
    const recent = await Donation.findOne({
      status: 'pending',
      provider: 'paymongo',
      amount: { $gte: Math.max(0, amount - tolerance), $lte: amount + tolerance },
    }).sort({ createdAt: -1 })
    if (recent) {
      console.log('[paymongo-webhook] matched by amount fallback (ref not found):', recent._id.toString(), 'amount=', amount)
      return recent
    }
  }

  return null
}

let eventType // used in findDonation closure above; set in POST handler

export async function POST(req) {
  try {
    await dbConnect()

    // Read body as raw ArrayBuffer → Buffer so HMAC operates on exact bytes
    // (req.text() can normalize line endings in some edge cases, breaking sig).
    const arrBuf = await req.arrayBuffer()
    const rawBody = Buffer.from(arrBuf)
    const signature = req.headers.get('paymongo-signature') || req.headers.get('x-paymongo-signature')

    let event
    try { event = JSON.parse(rawBody.toString('utf8')) } catch (_) {
      console.warn('[paymongo-webhook] invalid JSON body')
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    eventType = event?.data?.attributes?.type
    const eventData = event?.data?.attributes?.data || event?.data
    const eventId = event?.data?.id

    // PayMongo also wraps: event.data is the link for link.payment.paid events,
    // and the actual payment is at event.data.attributes.data.
    // For payment.paid events, event.data IS the payment directly.
    const payAttrs = (eventData?.attributes) || event?.data?.attributes || {}
    const paymentId = eventData?.id || event?.data?.id
    const status = payAttrs?.status
    const paidAt = payAttrs?.paid_at
    const amountPaid = payAttrs?.amount
    const paymentSource = payAttrs?.source?.type || payAttrs?.payment_method_type || null

    // Verify signature AFTER parsing so we can log the event type even if invalid
    if (!verifySignature(rawBody, signature)) {
      console.warn('[paymongo-webhook] INVALID SIGNATURE. event:', eventType, 'id:', eventId,
        WEBHOOK_SECRET ? 'secret configured' : 'NO SECRET (dev mode)')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    console.log('[paymongo-webhook] received event:', eventType, 'paymentId:', paymentId)

    if (!paymentId && eventType !== 'link.payment.paid') {
      return NextResponse.json({ received: true })
    }

    const donation = await findDonation(event.data)

    if (!donation) {
      console.warn('[paymongo-webhook] could not match donation for event:', eventType, 'payload keys:', Object.keys(payAttrs))
      return NextResponse.json({ received: true, warning: 'no matching donation' })
    }

    console.log('[paymongo-webhook] matched donation:', donation._id.toString(), 'current status:', donation.status, '->', eventType)

    switch (eventType) {
      case 'payment.paid':
      case 'link.payment.paid':
      case 'checkout_session.payment.paid': {
        if (donation.status !== 'completed') {
          donation.status = 'completed'
          donation.amount = amountPaid || donation.amount
          donation.paymongoPaymentId = paymentId || donation.paymongoPaymentId
          donation.stripePaymentIntentId = paymentId || donation.stripePaymentIntentId
          donation.paymentMethod = paymentSource || donation.paymentMethod
          donation.paidAt = paidAt ? new Date(paidAt * 1000) : new Date()
          donation.metadata = {
            ...(donation.metadata || {}),
            payment_id: paymentId,
            paid_at: paidAt,
            payment_source: paymentSource,
            fee: payAttrs?.fee,
            net_amount: payAttrs?.net_amount,
          }
          await donation.save()
          console.log('[paymongo-webhook] marked donation', donation._id.toString(), 'COMPLETED')
        }
        break
      }
      case 'payment.failed': {
        donation.status = 'failed'
        donation.metadata = {
          ...(donation.metadata || {}),
          payment_id: paymentId,
          failed_at: Date.now(),
          payment_source: paymentSource,
          last_error: payAttrs?.last_payment_error?.message || payAttrs?.errors?.[0]?.detail || 'Payment failed',
        }
        await donation.save()
        break
      }
      case 'payment.refunded':
      case 'payment.refund.updated': {
        donation.status = 'refunded'
        await donation.save()
        break
      }
      default:
        console.log('[paymongo-webhook] unhandled event type:', eventType)
    }

    return NextResponse.json({ received: true })
  } catch (e) {
    console.error('[paymongo-webhook] error:', e)
    // Always return 200 so PayMongo doesn't retry forever with malformed payloads
    return NextResponse.json({ received: true })
  }
}
