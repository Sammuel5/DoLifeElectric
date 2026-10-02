import "server-only";
import { GIFT_TYPES, PAYMENT_METHODS, pesosToCentavos, centavosToPesos, formatPHP } from './paymongo-config'
export { GIFT_TYPES, PAYMENT_METHODS, pesosToCentavos, centavosToPesos, formatPHP }

const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY
// Use v2 Checkout Sessions API (supports success_url / cancel_url redirect)
const API_BASE = 'https://api.paymongo.com/v2'
const API_BASE_V1 = 'https://api.paymongo.com/v1'

// Payment method types accepted at checkout. QRPh is what shows up for the
// user's screenshot — also include cards, e-wallets, and bank transfers.
const DEFAULT_PAYMENT_METHOD_TYPES = ['card', 'gcash', 'maya', 'grab_pay', 'qrph', 'bpi', 'ubp', 'billease', 'dob']

export function isPayMongoConfigured() {
  return !!(PAYMONGO_SECRET_KEY && PAYMONGO_SECRET_KEY.length > 10)
}

function authHeader() {
  return 'Basic ' + Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')
}

/**
 * Create a PayMongo Checkout Session.
 *
 * Checkout Sessions (v2) are PayMongo's modern hosted-checkout primitive.
 * Unlike the legacy Links API (v1/links), Checkout Sessions properly respect
 * success_url / cancel_url and auto-redirect customers back to your site after
 * payment — which is why we use them.
 *
 * Docs: https://docs.paymongo.com/reference/checkout-session-resource
 */
export async function createPayMongoLink({
  amountCentavos,
  description,
  referenceNumber,
  successUrl,
  cancelUrl,
}) {
  if (!PAYMONGO_SECRET_KEY) throw new Error('PayMongo not configured.')

  // Clean description (max 255 chars, no control chars)
  const lineName = String(description || 'Gift / Support').slice(0, 255).replace(/[\u0000-\u001F]/g, '')

  const payload = {
    data: {
      attributes: {
        line_items: [
          {
            name: lineName,
            amount: amountCentavos,
            currency: 'PHP',
            quantity: 1,
          },
        ],
        payment_method_types: DEFAULT_PAYMENT_METHOD_TYPES,
        success_url: successUrl,
        cancel_url: cancelUrl,
        reference_number: String(referenceNumber || '').slice(0, 255),
        send_email_receipt: false,
        show_description: true,
        show_line_items: true,
        metadata: {
          provider: 'dle-entertainment',
          reference_number: String(referenceNumber || ''),
        },
      },
    },
  }

  console.log('[paymongo] creating checkout session:', {
    amountCentavos,
    referenceNumber,
    successUrl,
    cancelUrl,
    lineName,
  })

  const res = await fetch(`${API_BASE}/checkout_sessions`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': authHeader(),
    },
    body: JSON.stringify(payload),
  })

  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch (_) { json = { raw: text } }

  if (!res.ok) {
    console.error('[paymongo] checkout session creation failed:', res.status, JSON.stringify(json).slice(0, 500))
    const msg = json?.errors?.map?.(e => e?.detail).filter(Boolean).join('; ')
      || json?.errors?.[0]?.detail
      || `PayMongo error (${res.status})`
    throw new Error(msg)
  }

  const attrs = json?.data?.attributes
  const checkoutUrl = attrs?.checkout_url
  if (!checkoutUrl) {
    console.error('[paymongo] no checkout_url in response:', JSON.stringify(json).slice(0, 500))
    throw new Error('PayMongo did not return a checkout URL')
  }

  console.log('[paymongo] checkout session created:', json.data.id, 'url:', checkoutUrl)

  return {
    id: json.data.id,                      // cs_xxx
    checkout_url: checkoutUrl,             // https://checkout.paymongo.com/...
    reference_number: attrs?.reference_number || referenceNumber,
    amount: attrs?.amount || amountCentavos,
    status: attrs?.status || 'active',
  }
}

export async function retrievePayment(paymentId) {
  const res = await fetch(`${API_BASE_V1}/payments/${paymentId}`, {
    headers: { 'Accept': 'application/json', 'Authorization': authHeader() },
  })
  if (!res.ok) throw new Error(`PayMongo retrieve payment failed (${res.status})`)
  return res.json()
}

/**
 * Retrieve a Checkout Session (cs_xxx) or legacy Link (link_xxx).
 * We try v2 first; if that 404s, fall back to v1/links for backward compat.
 */
export async function retrieveLink(linkId) {
  if (linkId?.startsWith('cs_')) {
    const res = await fetch(`${API_BASE}/checkout_sessions/${linkId}`, {
      headers: { 'Accept': 'application/json', 'Authorization': authHeader() },
    })
    if (res.ok) return res.json()
    if (res.status !== 404) throw new Error(`PayMongo retrieve checkout session failed (${res.status})`)
  }
  const res = await fetch(`${API_BASE_V1}/links/${linkId}`, {
    headers: { 'Accept': 'application/json', 'Authorization': authHeader() },
  })
  if (!res.ok) throw new Error(`PayMongo retrieve link failed (${res.status})`)
  return res.json()
}

/**
 * Extract payment status + amount from any PayMongo resource (Checkout Session,
 * Link, or Payment). Used by the client-sync endpoint to see if it's paid
 * without us having to know which API version the id belongs to.
 */
export async function retrieveResource(id) {
  // Try all known endpoints; return first 200
  const urls = id?.startsWith('cs_')
    ? [`${API_BASE}/checkout_sessions/${id}`, `${API_BASE_V1}/payments/${id}`]
    : id?.startsWith('pay_')
    ? [`${API_BASE_V1}/payments/${id}`]
    : [`${API_BASE_V1}/links/${id}`, `${API_BASE_V1}/payments/${id}`]
  for (const url of urls) {
    const res = await fetch(url, { headers: { Accept: 'application/json', Authorization: authHeader() } })
    if (res.ok) return res.json()
  }
  return null
}

