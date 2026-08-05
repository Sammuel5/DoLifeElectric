import { NextResponse } from 'next/server'
import crypto from 'crypto'
import dbConnect from '@/lib/dbConnect'
import Donation from '@/models/Donation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET

function verifySignature(rawBody, signatureHeader) {
  if (!WEBHOOK_SECRET || !signatureHeader) return false
  try {
    let sig = signatureHeader
    if (signatureHeader.includes(',')) {
      const parts = signatureHeader.split(',').reduce((acc, p) => {
        const [k, v] = p.trim().split('=')
        acc[k.trim()] = v.trim()
        return acc
      }, {})
      sig = parts.s || signatureHeader
    }
    const expected = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex')
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  } catch (_) {
    return false
  }
}

export async function POST(req) {
  try {
    await dbConnect()

    const rawBody = await req.text()
    const signature = req.headers.get('paymongo-signature') || req.headers.get('x-paymongo-signature')

    let event
    try { event = JSON.parse(rawBody) } catch (_) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (WEBHOOK_SECRET) {
      if (!verifySignature(rawBody, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const eventType = event?.data?.attributes?.type
    const eventData = event?.data?.attributes?.data
    if (!eventData?.id) return NextResponse.json({ received: true })

    const payAttrs = eventData.attributes || {}
    const refNumber = payAttrs?.metadata?.pm_reference_number || payAttrs?.external_reference_number || null
    const paymentId = eventData.id
    const status = payAttrs?.status
    const paidAt = payAttrs?.paid_at
    const amountPaid = payAttrs?.amount
    const paymentSource = payAttrs?.source?.type || null

    let donation = null
    if (refNumber && refNumber.startsWith('dle_')) {
      const id = refNumber.replace(/^dle_/, '')
      const mongoose = await import('mongoose')
      if (mongoose.default.Types.ObjectId.isValid(id)) {
        donation = await Donation.findById(id)
      }
    }
    if (!donation) {
      const donations = await Donation.find({
        status: 'pending',
        'metadata.provider': 'paymongo',
      }).sort({ createdAt: -1 }).limit(20)
      donation = donations.find(d => d.metadata?.reference_number === refNumber) || null
    }

    if (!donation) return NextResponse.json({ received: true })

    switch (eventType) {
      case 'payment.paid': {
        donation.status = 'completed'
        donation.amount = amountPaid || donation.amount
        donation.paymongoPaymentId = paymentId
        donation.stripePaymentIntentId = paymentId
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
      case 'link.payment.paid': {
        donation.status = 'completed'
        donation.amount = amountPaid || donation.amount
        await donation.save()
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (_) {
    return NextResponse.json({ received: true })
  }
}
