import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('WARNING: STRIPE_SECRET_KEY not set. Stripe payments will fail until configured.')
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null

// Gift item definitions
export const GIFT_TYPES = [
  { id: 'food', name: 'Food Support', emoji: '🍱', defaultAmounts: [5, 10, 20, 50] },
  { id: 'clothes', name: 'Clothes/Stage Outfit', emoji: '👗', defaultAmounts: [10, 25, 50, 100] },
  { id: 'gift', name: 'Small Gift', emoji: '🎁', defaultAmounts: [5, 15, 30, 75] },
  { id: 'money', name: 'Direct Support ($)', emoji: '💝', defaultAmounts: [5, 10, 25, 50, 100] },
]

export const PAYMENT_METHODS = [
  { id: 'card', name: 'Credit/Debit Card', icon: '💳' },
  { id: 'gcash', name: 'GCash', icon: '📱' },
  { id: 'paymaya', name: 'PayMaya', icon: '💳' },
  { id: 'bank', name: 'Bank Transfer', icon: '🏦' },
]
