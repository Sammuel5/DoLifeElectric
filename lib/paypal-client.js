'use client'

/**
 * Client-safe PayPal config helpers.
 * Only the PUBLIC client id is exposed here — secret is server-only.
 */

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ''
const ENVIRONMENT = (process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT || process.env.PAYPAL_ENVIRONMENT || 'sandbox').toLowerCase() === 'live' ? 'live' : 'sandbox'

export function isPayPalConfigured() {
  return !!(CLIENT_ID && CLIENT_ID.length > 5)
}
export function getPayPalClientId() { return CLIENT_ID }
export function getPayPalEnvironment() { return ENVIRONMENT }
