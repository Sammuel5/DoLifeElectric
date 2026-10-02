export const GIFT_TYPES = {
  food:    { emoji: '🍱', label: 'Food',             presetAmounts: [100, 250, 500, 1000] },
  clothes: { emoji: '👗', label: 'Clothes / Outfit', presetAmounts: [200, 500, 1000, 2000] },
  gift:    { emoji: '🎁', label: 'Support Gift',     presetAmounts: [100, 300, 700, 1500] },
  money:   { emoji: '💝', label: 'Cash Tip',         presetAmounts: [50, 200, 500, 1000, 5000] },
}

// PayMongo v2 Checkout Session payment_method_types. IDs must match what
// /v2/checkout_sessions accepts — sending an unknown id (e.g. the v1-era
// "maya", "bpi", "ubp", "grabpay") causes session creation to fail.
export const PAYMENT_METHODS = [
  { id: 'card',         label: 'Credit/Debit Card',      emoji: '💳' },
  { id: 'gcash',        label: 'GCash',                  emoji: '📱' },
  { id: 'paymaya',      label: 'Maya',                   emoji: '🏦' },
  { id: 'grab_pay',     label: 'GrabPay',                emoji: '💚' },
  { id: 'shopee_pay',   label: 'ShopeePay',              emoji: '🛒' },
  { id: 'qrph',         label: 'QR Ph',                  emoji: '🔳' },
  { id: 'billease',     label: 'Billease (Buy Now Pay Later)', emoji: '⏳' },
  { id: 'dob',          label: 'Online Banking (BPI / RCBC / etc.)', emoji: '🏧' },
  { id: 'dob_ubp',      label: 'UnionBank Online',       emoji: '🏧' },
  { id: 'brankas_bdo',  label: 'BDO Online',             emoji: '🏦' },
  { id: 'brankas_landbank', label: 'Landbank Online',    emoji: '🏦' },
  { id: 'brankas_metrobank', label: 'Metrobank Online',  emoji: '🏦' },
]

export function pesosToCentavos(pesos) {
  return Math.round(Number(pesos) * 100)
}

export function centavosToPesos(centavos) {
  return Number(centavos) / 100
}

export function formatPHP(centavos) {
  const pesos = centavosToPesos(centavos)
  return '₱' + pesos.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}
