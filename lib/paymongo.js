import "server-only";
import { GIFT_TYPES, PAYMENT_METHODS, pesosToCentavos, centavosToPesos, formatPHP } from './paymongo-config'
export { GIFT_TYPES, PAYMENT_METHODS, pesosToCentavos, centavosToPesos, formatPHP }

const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY
// Use v2 Checkout Sessions API (supports success_url / cancel_url redirect)
const API_BASE = 'https://api.paymongo.com/v2'
const API_BASE_V1 = 'https://api.paymongo.com/v1'

// Payment method types accepted at PayMongo v2 Checkout Sessions.
// Notes on naming (v2 differs from the legacy v1/links API):
//   - "maya" was renamed to "paymaya" in v2.
//   - There is no standalone "bpi" in v2 — BPI is covered by the generic "dob"
//     (Dragonpay Online Banking) bank picker.
//   - "ubp" (UnionBank) is "dob_ubp" in v2.
//   - "grabpay" (camelCase) is invalid; v2 requires "grab_pay" (snake_case).
//   - We also add shopee_pay (popular PH e-wallet).
//   - brankas_* entries enable specific direct-bank transfers (BDO/Landbank/Metrobank).
// If PayMongo has not yet activated a method for the merchant account, the
// checkout page simply hides it — but sending an unknown identifier causes
// the entire session creation to fail with "invalid payment_methods".
const DEFAULT_PAYMENT_METHOD_TYPES = [
  'card',
  'gcash',
  'paymaya',
  'grab_pay',
  'shopee_pay',
  'qrph',
  'billease',
  'dob',        // generic online banking (covers BPI, RCBC, and other banks)
  'dob_ubp',    // UnionBank direct
  'brankas_bdo',
  'brankas_landbank',
  'brankas_metrobank',
]

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
 * Retrieve any PayMongo resource by id — tries the appropriate endpoints
 * based on the id prefix and returns the parsed JSON or null.
 *
 * Prefix → endpoint tried (in order):
 *   cs_   → v2 /checkout_sessions/:id, v1 /checkout_sessions/:id, v1 /payments/:id
 *   pay_  → v1 /payments/:id
 *   pi_   → v1 /payment_intents/:id
 *   link_ → v1 /links/:id, v1 /payments/:id
 *   else  → try v2 checkout_sessions, v1 links, v1 payments
 */
export async function retrieveResource(id) {
  if (!id) return null
  const tryGet = async (url) => {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json', Authorization: authHeader() } })
      if (res.ok) return res.json()
    } catch (_) { /* ignore and try next */ }
    return null
  }
  let urls = []
  if (id.startsWith('cs_')) {
    urls = [
      `${API_BASE}/checkout_sessions/${id}`,
      `${API_BASE_V1}/checkout_sessions/${id}`,
      `${API_BASE_V1}/payments/${id}`,
    ]
  } else if (id.startsWith('pay_')) {
    urls = [`${API_BASE_V1}/payments/${id}`]
  } else if (id.startsWith('pi_')) {
    urls = [`${API_BASE_V1}/payment_intents/${id}`, `${API_BASE_V1}/payments/${id}`]
  } else if (id.startsWith('link_')) {
    urls = [`${API_BASE_V1}/links/${id}`, `${API_BASE_V1}/payments/${id}`]
  } else {
    urls = [
      `${API_BASE}/checkout_sessions/${id}`,
      `${API_BASE_V1}/links/${id}`,
      `${API_BASE_V1}/payments/${id}`,
    ]
  }
  for (const url of urls) {
    const json = await tryGet(url)
    if (json) return json
  }
  return null
}

/**
 * Given a retrieved PayMongo resource (Checkout Session, Link, Payment, or
 * Payment Intent), return a normalized status summary:
 *   { status: 'paid'|'failed'|'refunded'|'pending'|'expired',
 *     amount, paymentId, paymentSource, paidAt, fee, netAmount }
 * Returns null when the resource can't be interpreted.
 */
export function interpretResource(resource) {
  if (!resource?.data) return null
  const d = resource.data
  const attrs = d.attributes || {}

  // --- Checkout Session (cs_xxx) — v1 or v2 ---
  if (d.id?.startsWith('cs_') || d.type === 'checkout_session') {
    const payments = Array.isArray(attrs.payments) ? attrs.payments : []
    const paidPay = payments.slice().reverse().find(p => p?.attributes?.status === 'paid')
    if (paidPay) {
      return {
        status: 'paid',
        amount: paidPay.attributes.amount || attrs.amount,
        paymentId: paidPay.id,
        paymentSource: paidPay.attributes?.source?.type || paidPay.attributes?.payment_method_type,
        paidAt: paidPay.attributes?.paid_at,
        fee: paidPay.attributes?.fee,
        netAmount: paidPay.attributes?.net_amount,
      }
    }
    const failedPay = payments.slice().reverse().find(p => p?.attributes?.status === 'failed')
    if (failedPay) {
      return { status: 'failed', amount: failedPay.attributes.amount, paymentId: failedPay.id, paymentSource: failedPay.attributes?.source?.type }
    }
    const refundedPay = payments.slice().reverse().find(p => p?.attributes?.status === 'refunded')
    if (refundedPay) return { status: 'refunded', amount: refundedPay.attributes.amount, paymentId: refundedPay.id }
    if (attrs.status === 'expired') return { status: 'expired', amount: attrs.amount }
    const lineTotal = Array.isArray(attrs.line_items)
      ? attrs.line_items.reduce((s, li) => s + (li.amount || 0) * (li.quantity || 1), 0)
      : attrs.amount || 0
    return { status: 'pending', amount: lineTotal }
  }

  // --- Payment (pay_xxx) ---
  if (d.id?.startsWith('pay_') || d.type === 'payment') {
    const s = attrs.status
    return {
      status: s === 'paid' ? 'paid' : s === 'failed' ? 'failed' : s === 'refunded' ? 'refunded' : 'pending',
      amount: attrs.amount,
      paymentId: d.id,
      paymentSource: attrs?.source?.type || attrs?.payment_method_type,
      paidAt: attrs.paid_at,
      fee: attrs.fee,
      netAmount: attrs.net_amount,
    }
  }

  // --- Legacy Link (link_xxx) ---
  if (d.id?.startsWith('link_')) {
    const payments = Array.isArray(attrs.payments) ? attrs.payments : []
    if (payments.length) {
      const last = payments[payments.length - 1]
      const s = last?.attributes?.status
      return {
        status: s === 'paid' ? 'paid' : s === 'failed' ? 'failed' : s === 'refunded' ? 'refunded' : 'pending',
        amount: last.attributes.amount || attrs.amount,
        paymentId: last.id,
        paymentSource: last.attributes?.source?.type,
        paidAt: last.attributes?.paid_at,
      }
    }
    return { status: attrs.status === 'paid' ? 'paid' : 'pending', amount: attrs.amount }
  }

  return null
}

