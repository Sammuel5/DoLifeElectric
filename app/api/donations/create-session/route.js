import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import { createPayMongoLink, GIFT_TYPES, pesosToCentavos, isPayMongoConfigured } from '@/lib/paymongo'
import Donation from '@/models/Donation'
import Artist from '@/models/Artist'

export const dynamic = 'force-dynamic'

// POST /api/donations/create-session
// Creates a PayMongo Link (hosted checkout) for the gift donation.
export async function POST(req) {
  try {
    // 1. Authentication required
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in with Google first.' },
        { status: 401 }
      )
    }

    if (!isPayMongoConfigured()) {
      return NextResponse.json({
        error: 'Payment system not configured yet. Please set PAYMONGO_SECRET_KEY in .env.local. See TUTORIAL.md Step 3.',
      }, { status: 503 })
    }

    if (!process.env.MONGODB_URI) {
      return NextResponse.json({
        error: 'Database not configured. Set MONGODB_URI in .env.local.',
      }, { status: 503 })
    }

    await dbConnect()

    const body = await req.json().catch(() => ({}))
    const {
      artistId, giftType, amountPesos, message = '', paymentMethod = 'card',
    } = body

    // 2. Validation
    if (!giftType || !GIFT_TYPES[giftType]) {
      return NextResponse.json({ error: 'Invalid gift type.' }, { status: 400 })
    }
    // Ensure amount is a finite number (reject strings, NaN, objects, etc.)
    if (typeof amountPesos !== 'number' || !Number.isFinite(amountPesos)) {
      return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 })
    }
    const amount = Math.round(amountPesos * 100) / 100 // round to 2 decimals
    if (amount < 1) {
      return NextResponse.json({ error: 'Minimum gift amount is ₱1.00' }, { status: 400 })
    }
    if (amount > 100000) {
      return NextResponse.json({ error: 'Maximum gift amount is ₱100,000' }, { status: 400 })
    }
    // Sanitize message — strip HTML tags and enforce length
    const cleanMessage = String(message || '').replace(/<[^>]*>/g, '').slice(0, 500)

    // 3. Look up artist
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

    // 4. Build description shown on PayMongo checkout page (strip any control chars)
    const shortMsg = cleanMessage.slice(0, 80)
    const description = `${giftInfo.emoji} ${giftInfo.label} for ${artistName}${shortMsg ? ` — "${shortMsg}"` : ''}`

    // 5. Create PENDING donation record first (reference_number for PayMongo link)
    const donation = await Donation.create({
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name || '',
      artistId: artistObjId,
      artistName,
      giftType,
      amount: 0, // will be set when PayMongo confirms (we store in centavos)
      currency: 'php',
      provider: 'paymongo',
      paymentMethod,
      message: cleanMessage,
      status: 'pending',
    })

    // 6. Build success/cancel URLs
    //
    // PRIORITY for picking the site origin:
    //   1. NEXT_PUBLIC_SITE_URL  (canonical production URL — safest)
    //   2. SITE_URL              (server-only version of the above)
    //   3. VERCEL_PRODUCTION_URL (auto-provided by Vercel for production deployments)
    //   4. VERCEL_URL            (auto-provided by Vercel; only used in production)
    //   5. Request headers       (x-forwarded-proto + host — reliable on Vercel)
    //   6. NEXTAUTH_URL          (fallback — but IGNORED in production if it points
    //                             to localhost, because PayMongo won't redirect to
    //                             localhost from a live checkout page)
    //   7. Hardcoded safety net: https://dle-entertainment.com
    //
    // If we end up with a localhost/127.0.0.1 URL in production, PayMongo silently
    // discards the redirect and shows the static "Payment Received" page with no
    // back button — which is exactly the bug you're seeing.
    const reqProto = req.headers.get('x-forwarded-proto') || 'https'
    const reqHost = req.headers.get('host') || ''
    const isProdEnv = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'

    const CANDIDATES = [
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.SITE_URL,
      process.env.VERCEL_PRODUCTION_URL && `https://${process.env.VERCEL_PRODUCTION_URL}`,
      process.env.VERCEL_URL && process.env.VERCEL_ENV === 'production' && `https://${process.env.VERCEL_URL}`,
      reqHost && !reqHost.includes('localhost') && !reqHost.includes('127.0.0.1')
        ? `${reqProto}://${reqHost}`
        : null,
      !isProdEnv ? process.env.NEXTAUTH_URL : null,
      'https://dle-entertainment.com',
    ].filter(Boolean)

    // Pick the first candidate that looks like a valid HTTPS URL (and isn't localhost in prod)
    let origin = CANDIDATES.find(c => {
      if (!c || typeof c !== 'string') return false
      if (!c.startsWith('http')) return false
      try {
        const u = new URL(c)
        if (isProdEnv && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) return false
        return true
      } catch { return false }
    }) || 'https://dle-entertainment.com'

    // Ensure origin doesn't have trailing slash
    const cleanOrigin = origin.replace(/\/+$/, '')

    // Success lands on the homepage with a thank-you toast + payment ref
    // (keeps user in the flow instead of dumping them on the artists page).
    const successUrl = `${cleanOrigin}/?gift=success&ref=${donation._id}&artist=${encodeURIComponent(artistName)}&artistId=${artistObjId || ''}`
    const cancelUrl = `${cleanOrigin}/?gift=cancelled&ref=${donation._id}`

    console.log('[create-session] PayMongo redirect URLs:', {
      isProdEnv,
      host: reqHost,
      chosenOrigin: cleanOrigin,
      successUrl,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || '(unset)',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || '(unset)',
      VERCEL_URL: process.env.VERCEL_URL || '(unset)',
      VERCEL_ENV: process.env.VERCEL_ENV || '(unset)',
    })

    const amountCentavos = pesosToCentavos(amount)

    // 7. Create PayMongo Link
    const referenceNumber = `dle_${donation._id}`
    const link = await createPayMongoLink({
      amountCentavos,
      description,
      referenceNumber,
      successUrl,
      cancelUrl,
    })

    // 8. Update donation with PayMongo link info
    donation.paymongoLinkId = link.id
    donation.paymongoReferenceNo = link.reference_number
    donation.checkoutUrl = link.checkout_url
    // Legacy compat fields (any old test data):
    donation.stripeSessionId = link.id
    donation.stripePaymentIntentId = link.reference_number
    donation.metadata = {
      provider: 'paymongo',
      link_id: link.id,
      checkout_url: link.checkout_url,
      reference_number: link.reference_number,
      amount_requested_pesos: amount,
    }
    donation.amount = amountCentavos
    await donation.save()

    return NextResponse.json({
      url: link.checkout_url,
      donationId: donation._id,
      provider: 'paymongo',
    })
  } catch (e) {
    console.error('[create-session] error:', e)
    return NextResponse.json({ error: e.message || 'Failed to create payment link' }, { status: 500 })
  }
}
