import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import dbConnect from '@/lib/dbConnect'
import Donation from '@/models/Donation'

// SECURITY: Stripe webhook - validates Stripe signature to prevent spoofed events
// This ensures ONLY Stripe can confirm payments, no hackers can fake payments
export async function POST(req) {
  try {
    const body = await req.text()
    const signature = headers().get('stripe-signature')

    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 })
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    await dbConnect()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        await Donation.findOneAndUpdate(
          { stripeSessionId: session.id },
          {
            status: 'completed',
            stripePaymentIntentId: session.payment_intent,
            metadata: session,
          }
        )
        // Funds automatically deposited to DLE's single Stripe-connected bank account
        // Owner manually distributes to artists from there
        console.log(`✅ Donation completed: ${session.id}, amount: ${session.amount_total}`)
        break
      }
      case 'checkout.session.async_payment_failed':
      case 'payment_intent.payment_failed': {
        const session = event.data.object
        await Donation.findOneAndUpdate(
          { stripeSessionId: session.id },
          { status: 'failed' }
        )
        console.log(`❌ Payment failed: ${session.id}`)
        break
      }
      case 'charge.refunded': {
        const charge = event.data.object
        await Donation.findOneAndUpdate(
          { stripePaymentIntentId: charge.payment_intent },
          { status: 'refunded' }
        )
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (e) {
    console.error('Webhook error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
// Stripe needs raw body - we use req.text() so body parsing is not an issue in App Router
