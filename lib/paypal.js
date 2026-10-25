import "server-only";

/**
 * PayPal Server-side helper (PayPal Orders v2 API)
 *
 * Docs: https://developer.paypal.com/docs/api/orders/v2/
 *
 * Environment variables:
 *   PAYPAL_CLIENT_ID       — OAuth2 client id (from PayPal Developer Dashboard)
 *   PAYPAL_CLIENT_SECRET   — OAuth2 secret (server-only, never expose)
 *   PAYPAL_WEBHOOK_ID      — Webhook ID (used to verify webhook signatures)
 *   PAYPAL_ENVIRONMENT     — "sandbox" (default) or "live"
 *   NEXT_PUBLIC_PAYPAL_CLIENT_ID — same client id, public (for client-side JS SDK)
 */

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID
const ENVIRONMENT = (process.env.PAYPAL_ENVIRONMENT || 'sandbox').toLowerCase() === 'live' ? 'live' : 'sandbox'

const API_BASE = ENVIRONMENT === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

const JS_SDK_BASE = ENVIRONMENT === 'live'
  ? 'https://www.paypal.com'
  : 'https://www.sandbox.paypal.com'

export function isPayPalConfigured() {
  return !!(CLIENT_ID && CLIENT_SECRET && CLIENT_ID.length > 10 && CLIENT_SECRET.length > 10)
}

export function getPayPalEnvironment() {
  return ENVIRONMENT
}

export function getPayPalClientId() {
  return CLIENT_ID || ''
}

// Cache access token (PayPal tokens last ~9 hours)
let _tokenCache = { token: null, expiresAt: 0 }

async function getAccessToken() {
  if (_tokenCache.token && Date.now() < _tokenCache.expiresAt - 60_000) {
    return _tokenCache.token
  }
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`PayPal auth failed (${res.status}): ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  _tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 32400) * 1000,
  }
  return _tokenCache.token
}

async function paypalFetch(path, { method = 'GET', body } = {}) {
  const token = await getAccessToken()
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'PayPal-Request-Id': `dle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${API_BASE}${path}`, opts)
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch (_) { json = { raw: text } }
  return { res, json }
}

/**
 * Create a PayPal Order.
 * Returns { id: orderId, status, links, approveUrl }
 * The client JS SDK will handle launching the popup using the orderID, not a redirect.
 */
export async function createPayPalOrder({
  amountCentavos,
  description,
  referenceNumber,
  currency = 'PHP',
}) {
  const amount = Number(amountCentavos) / 100 // PayPal wants decimal currency units
  // PayPal amount: value must be a string with up to 2 decimals
  const value = amount.toFixed(2)

  const { res, json } = await paypalFetch('/v2/checkout/orders', {
    method: 'POST',
    body: {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: referenceNumber,
          description: String(description || 'DLE Gift / Support').slice(0, 127),
          amount: {
            currency_code: currency,
            value,
          },
          custom_id: referenceNumber,
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
            brand_name: 'DLE Media Productions',
            locale: 'en-PH',
            landing_page: 'GUEST_CHECKOUT',
            shipping_preference: 'NO_SHIPPING',
            user_action: 'PAY_NOW',
          },
        },
      },
    },
  })

  if (!res.ok) {
    const msg = json?.details?.map?.(d => `${d.issue || ''}: ${d.description || ''}`).filter(Boolean).join('; ')
      || json?.message
      || `PayPal error (${res.status})`
    throw new Error(msg)
  }

  return {
    id: json.id,
    status: json.status,
  }
}

/**
 * Capture (finalize) a PayPal Order after the fan approves in the popup.
 */
export async function capturePayPalOrder(orderId) {
  const { res, json } = await paypalFetch(`/v2/checkout/orders/${orderId}/capture`, { method: 'POST' })
  if (!res.ok) {
    const msg = json?.details?.map?.(d => d.description).filter(Boolean).join('; ') || json?.message || `Capture failed (${res.status})`
    throw new Error(msg)
  }
  return normalizeOrder(json)
}

/**
 * Retrieve an order by ID (used by client-sync endpoint).
 */
export async function getPayPalOrder(orderId) {
  const { res, json } = await paypalFetch(`/v2/checkout/orders/${orderId}`)
  if (!res.ok) return null
  return normalizeOrder(json)
}

/**
 * Normalize a PayPal order into our internal status format.
 */
function normalizeOrder(order) {
  if (!order) return null
  // In v2, capture is in purchase_units[0].payments.captures[0] after capture
  const pu = order.purchase_units?.[0] || {}
  const captures = pu.payments?.captures || []
  const refundedCaps = pu.payments?.refunds || []
  const capture = captures[captures.length - 1] || null

  const referenceNumber = pu.reference_id || pu.custom_id || ''

  let status = 'pending'
  let amount = 0
  let paymentId = ''
  let fee = null
  let netAmount = null
  let paidAt = null
  let payerEmail = ''
  let payerName = ''

  if (capture) {
    paymentId = capture.id
    amount = Math.round(Number(capture.amount?.value || 0) * 100) // to centavos
    if (capture.status === 'COMPLETED') status = 'paid'
    else if (capture.status === 'DECLINED' || capture.status === 'FAILED') status = 'failed'
    else if (capture.status === 'REFUNDED' || (capture.status === 'PARTIALLY_REFUNDED')) status = refundedCaps.length > 0 ? 'refunded' : 'paid'
    paidAt = capture.create_time ? Math.floor(new Date(capture.create_time).getTime() / 1000) : null
    if (capture.seller_receivable_breakdown) {
      fee = capture.seller_receivable_breakdown.paypal_fee
        ? Math.round(Number(capture.seller_receivable_breakdown.paypal_fee.value) * 100)
        : null
      netAmount = capture.seller_receivable_breakdown.net_amount
        ? Math.round(Number(capture.seller_receivable_breakdown.net_amount.value) * 100)
        : null
    }
  } else if (order.status === 'APPROVED') {
    status = 'pending' // buyer approved but we haven't captured yet
  } else if (order.status === 'VOIDED') {
    status = 'failed'
  } else if (order.status === 'COMPLETED') {
    status = 'paid'
    // COMPLETED without a capture block (shouldn't happen, but safety net)
    if (pu.amount?.value) amount = Math.round(Number(pu.amount.value) * 100)
  }

  const payer = order.payer || {}
  payerEmail = payer.email_address || ''
  payerName = [payer.name?.given_name, payer.name?.surname].filter(Boolean).join(' ')

  return {
    orderId: order.id,
    status,
    amount,
    currency: pu.amount?.currency_code || 'PHP',
    paymentId,
    referenceNumber,
    fee,
    netAmount,
    paidAt,
    payerEmail,
    payerName,
    raw: order,
  }
}

/**
 * Verify a PayPal webhook signature using PayPal's verify-webhook-signature API
 * (PayPal doesn't do HMAC — they require you to POST the signature headers + body
 * back to them for verification, same as Stripe's constructEvent for webhooks).
 *
 * Returns true/false.
 */
export async function verifyPayPalWebhook({ headers, rawBody }) {
  if (!CLIENT_ID || !CLIENT_SECRET || !WEBHOOK_ID) return true // accept all in dev
  try {
    const authAlgo = headers['paypal-auth-algo']
    const certUrl = headers['paypal-cert-url']
    const transmissionId = headers['paypal-transmission-id']
    const transmissionSig = headers['paypal-transmission-sig']
    const transmissionTime = headers['paypal-transmission-time']

    if (!transmissionId || !transmissionSig || !transmissionTime) return false

    const token = await getAccessToken()
    const res = await fetch(`${API_BASE}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: WEBHOOK_ID,
        webhook_event: JSON.parse(rawBody.toString('utf8')),
      }),
    })
    const data = await res.json().catch(() => ({}))
    return data.verification_status === 'SUCCESS'
  } catch (e) {
    console.error('[paypal] webhook verify error:', e.message)
    return false
  }
}

export { JS_SDK_BASE }
