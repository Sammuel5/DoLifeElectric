export const GIFT_TYPES = {
  food:    { emoji: '🍱', label: 'Food',             presetAmounts: [100, 250, 500, 1000] },
  clothes: { emoji: '👗', label: 'Clothes / Outfit', presetAmounts: [200, 500, 1000, 2000] },
  gift:    { emoji: '🎁', label: 'Support Gift',     presetAmounts: [100, 300, 700, 1500] },
  money:   { emoji: '💝', label: 'Cash Tip',         presetAmounts: [50, 200, 500, 1000, 5000] },
}

export const PAYMENT_METHODS = [
  { id: 'card',    label: 'Credit/Debit Card', emoji: '💳' },
  { id: 'gcash',   label: 'GCash',             emoji: '📱' },
  { id: 'maya',    label: 'Maya',              emoji: '🏦' },
  { id: 'grabpay', label: 'GrabPay',           emoji: '💚' },
  { id: 'bpi',     label: 'BPI Online',        emoji: '🏧' },
  { id: 'ubp',     label: 'UnionBank Online',  emoji: '🏧' },
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
