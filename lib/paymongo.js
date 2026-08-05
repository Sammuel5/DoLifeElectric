import "server-only";
import { GIFT_TYPES, PAYMENT_METHODS, pesosToCentavos, centavosToPesos, formatPHP } from './paymongo-config'
export { GIFT_TYPES, PAYMENT_METHODS, pesosToCentavos, centavosToPesos, formatPHP }

const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY
const API_BASE = 'https://api.paymongo.com/v1'

export function isPayMongoConfigured() {
  return !!(PAYMONGO_SECRET_KEY && PAYMONGO_SECRET_KEY.length > 10)
}

function authHeader() {
  return 'Basic ' + Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')
}

export async function createPayMongoLink({
  amountCentavos,
  description,
  referenceNumber,
  successUrl,
  cancelUrl,
}) {
  if (!PAYMONGO_SECRET_KEY) throw new Error('PayMongo not configured.')

  const payload = {
    data: {
      attributes: {
        amount: amountCentavos,
        currency: 'PHP',
        description: String(description || '').slice(0, 255),
        reference_number: String(referenceNumber || '').slice(0, 255),
        success_url: successUrl,
        cancel_url: cancelUrl,
      },
    },
  }

  const res = await fetch(`${API_BASE}/links`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': authHeader(),
    },
    body: JSON.stringify(payload),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = json?.errors?.[0]?.detail || `PayMongo error (${res.status})`
    throw new Error(msg)
  }

  const attrs = json?.data?.attributes
  return {
    id: json.data.id,
    checkout_url: attrs?.checkout_url,
    reference_number: attrs?.reference_number,
    amount: attrs?.amount,
    status: attrs?.status,
  }
}

export async function retrievePayment(paymentId) {
  const res = await fetch(`${API_BASE}/payments/${paymentId}`, {
    headers: { 'Accept': 'application/json', 'Authorization': authHeader() },
  })
  if (!res.ok) throw new Error(`PayMongo retrieve payment failed (${res.status})`)
  return res.json()
}

export async function retrieveLink(linkId) {
  const res = await fetch(`${API_BASE}/links/${linkId}`, {
    headers: { 'Accept': 'application/json', 'Authorization': authHeader() },
  })
  if (!res.ok) throw new Error(`PayMongo retrieve link failed (${res.status})`)
  return res.json()
}
