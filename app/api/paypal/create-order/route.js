import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import { createPayPalOrder, isPayPalConfigured } from '@/lib/paypal'
import { GIFT_TYPES, pesosToCentavos } from '@/lib/paymongo-config'
import Donation from '@/models/Donation'
import Artist from '@/models/Artist'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/paypal/create-order
 *
 * Creates a PayPal Order for the gift donation. Returns { orderId } which
 * the client-side PayPal JS SDK uses to open the Smart Payment Buttons popup.
 * This is analogous to /api/donations/create-session for PayMongo.
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in with Google first.' },
        { status: 401 }
      )
    }

    if (!isPayPalConfigured()) {
      return NextResponse.json({
        error: 'PayPal not configured. Set PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET in env vars.',
      }, { status: 503 })
    }

    if (!process.env.MONGODB_URI) {
      return NextResponse.json({
        error: 'Database not configured.',
      }, { status: 503 })
    }

    await dbConnect()

    const body = await req.json().catch(() => ({}))
    const { artistId, giftType, amountPesos, message = '' } = body

    if (!giftType || !GIFT_TYPES[giftType]) {
      return NextResponse.json({ error: 'Invalid gift type.' }, { status: 400 })
    }
    if (typeof amountPesos !== 'number' || !Number.isFinite(amountPesos)) {
      return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 })
    }
    const amount = Math.round(amountPesos * 100) / 100
    if (amount < 1) return NextResponse.json({ error: 'Minimum gift amount is ₱1.00' }, { status: 400 })
    if (amount > 100000) return NextResponse.json({ error: 'Maximum gift amount is ₱100,000' }, { status: 400 })

    const cleanMessage = String(message || '').replace(/<[^>]*>/g, '').slice(0, 500)

    let artistName = 'DLE Entertainment (General)'
    let artistObjId = null
    if (artistId) {
      try {
        const mongoose = await import('mongoose')
        if (mongoose.default.Types.ObjectId.isValid(artistId)) {
          const artist = await Artist.findById(artistId)
          if (artist) {
            artistName = artist.name
            artistObjId = artist._id
          }
        }
      } catch (_) {}
    }

    const giftInfo = GIFT_TYPES[giftType]
    const shortMsg = cleanMessage.slice(0, 80)
    const description = `${giftInfo.emoji} ${giftInfo.label} for ${artistName}${shortMsg ? ` — "${shortMsg}"` : ''}`

    // Create PENDING donation record first
    const donation = await Donation.create({
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name || '',
      artistId: artistObjId,
      artistName,
      giftType,
      amount: 0,
      currency: 'php',
      provider: 'paypal',
      paymentMethod: 'paypal',
      message: cleanMessage,
      status: 'pending',
    })

    const referenceNumber = `dle_${donation._id}`
    const amountCentavos = pesosToCentavos(amount)

    const order = await createPayPalOrder({
      amountCentavos,
      description,
      referenceNumber,
      currency: 'PHP',
    })

    donation.paypalOrderId = order.id
    donation.paypalReferenceNo = referenceNumber
    donation.metadata = {
      provider: 'paypal',
      order_id: order.id,
      reference_number: referenceNumber,
      amount_requested_pesos: amount,
    }
    donation.amount = amountCentavos
    await donation.save()

    console.log('[paypal] created order', order.id, 'for donation', donation._id.toString(), 'amount', amountCentavos)

    return NextResponse.json({
      orderId: order.id,
      donationId: donation._id.toString(),
      provider: 'paypal',
    })
  } catch (e) {
    console.error('[paypal create-order] error:', e)
    return NextResponse.json({ error: e.message || 'Failed to create PayPal order' }, { status: 500 })
  }
}
