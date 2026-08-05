'use client'
import { useState } from 'react'
import { ArrowLeft, Lock, Shield, Heart } from 'lucide-react'
import { GIFT_TYPES } from '@/lib/paymongo-config'
import { useSession, signIn } from 'next-auth/react'
import toast from 'react-hot-toast'

// Convert GIFT_TYPES object to array for mapping
const GIFT_TYPES_LIST = Object.entries(GIFT_TYPES).map(([id, g]) => ({
  id,
  emoji: g.emoji,
  name: g.label,
  defaultAmounts: g.presetAmounts,
}))

export default function GiftDonation({ artist, onBack, onClose }) {
  const { data: session } = useSession()
  const [step, setStep] = useState('type') // type | amount | confirm | processing
  const [giftType, setGiftType] = useState(null)
  const [amount, setAmount] = useState(null)
  const [customAmount, setCustomAmount] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const requireLogin = () => {
    if (!session) {
      toast.error('Please sign in with Google first to send a gift securely')
      signIn('google', { callbackUrl: window.location.href })
      return false
    }
    return true
  }

  const pickGift = type => { if (!requireLogin()) return; setGiftType(type); setStep('amount') }
  const pickAmount = a => { setAmount(a); setStep('confirm') }

  const getAmountPesos = () => {
    const a = customAmount ? parseFloat(customAmount) : amount
    return Number(a) // in PHP pesos
  }

  const handleCheckout = async () => {
    if (!requireLogin()) return
    setLoading(true)
    try {
      const res = await fetch('/api/donations/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId: artist._id,
          giftType: giftType.id,
          amountPesos: getAmountPesos(),
          message,
        }),
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error); setLoading(false); return }
      // Redirect to PayMongo hosted checkout page
      window.location.href = data.url
    } catch (e) {
      toast.error('Payment failed: ' + e.message)
      setLoading(false)
    }
  }

  const formattedAmount = () => {
    const a = customAmount ? parseFloat(customAmount) : amount
    if (!a) return ''
    return '₱' + Number(a).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }

  return (
    <div className="p-4 sm:p-5 md:p-8 bg-dark-card">
      {step !== 'type' && (
        <button onClick={() => setStep(step === 'confirm' ? 'amount' : 'type')} className="flex items-center gap-2 text-white/60 hover:text-gold text-sm mb-4 active:scale-95">
          <ArrowLeft size={16} /> Back
        </button>
      )}

      {/* SECURITY BADGE */}
      <div className="flex items-start sm:items-center gap-2 mb-4 text-gold/80 text-[11px] sm:text-xs">
        <Shield size={14} className="flex-shrink-0 mt-0.5 sm:mt-0" />
        <span>Secured by PayMongo • BSP Licensed</span>
      </div>

      <h2 className="font-display text-xl sm:text-2xl md:text-3xl text-white uppercase mb-1 leading-tight">
        Send a Gift {artist && <span className="gold-text">to {artist.name}</span>}
      </h2>
      <p className="text-white/50 text-xs sm:text-sm mb-5 sm:mb-6">All gifts go to DLE Entertainment's secure PayMongo account and are distributed to artists.</p>

      {!session && (
        <div className="bg-gold/10 border border-gold/30 p-4 mb-5">
          <p className="text-gold text-sm mb-3">🔒 You need to sign in to send a gift. This prevents fraud.</p>
          <button onClick={() => signIn('google')} className="btn-gold text-xs">Sign in with Google</button>
        </div>
      )}

      {/* STEP 1: Choose gift type */}
      {step === 'type' && (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {GIFT_TYPES_LIST.map(g => (
            <button key={g.id} onClick={() => pickGift(g)} disabled={!session}
              className="border border-white/10 hover:border-gold bg-dark-light p-4 sm:p-5 text-center transition-all hover:bg-gold/10 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95">
              <div className="text-3xl sm:text-4xl mb-1.5 sm:mb-2">{g.emoji}</div>
              <div className="font-display text-xs sm:text-sm uppercase tracking-wider text-white">{g.name}</div>
            </button>
          ))}
        </div>
      )}

      {/* STEP 2: Choose amount */}
      {step === 'amount' && giftType && (
        <div>
          <div className="flex items-center gap-3 mb-4 text-gold">
            <span className="text-2xl sm:text-3xl">{giftType.emoji}</span>
            <span className="font-display text-base sm:text-lg uppercase">{giftType.name}</span>
          </div>
          <p className="text-white/60 text-sm mb-4">Choose an amount (₱):</p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
            {giftType.defaultAmounts.map(a => (
              <button key={a} onClick={() => pickAmount(a)}
                className={`border-2 p-3 sm:p-4 font-display text-base sm:text-lg uppercase transition-all active:scale-95 ${amount === a ? 'border-gold bg-gold/20 text-gold' : 'border-white/10 hover:border-gold text-white'}`}>
                ₱{a.toLocaleString()}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-white/50 text-lg">₱</span>
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              placeholder="Custom amount"
              value={customAmount}
              onChange={e => { setCustomAmount(e.target.value); setAmount(null) }}
              className="form-input flex-1"
            />
            <button
              onClick={() => customAmount && parseFloat(customAmount) >= 1 && pickAmount(null)}
              disabled={!customAmount || parseFloat(customAmount) < 1}
              className="btn-gold disabled:opacity-40 px-4"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Confirm + payment methods + message + pay */}
      {step === 'confirm' && (
        <div className="space-y-4 sm:space-y-5">
          <div className="bg-dark-light p-3 sm:p-4 border border-white/5">
            <div className="flex justify-between items-center gap-3">
              <span className="text-white/60 text-xs sm:text-sm">{giftType.emoji} {giftType.name}</span>
              <span className="font-display text-xl sm:text-2xl gold-text whitespace-nowrap">{formattedAmount()}</span>
            </div>
            {artist && <div className="text-xs text-white/40 mt-1 truncate">For: {artist.name}</div>}
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-white/60 mb-2 block">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              <div className="border-2 border-gold bg-gold/10 text-gold p-2.5 sm:p-3 text-center">
                <div className="text-lg mb-0.5">📱</div>
                <div className="text-[10px] sm:text-xs font-semibold">QR PH</div>
              </div>
              <div className="border-2 border-gold bg-gold/10 text-gold p-2.5 sm:p-3 text-center">
                <div className="text-lg mb-0.5">💳</div>
                <div className="text-[10px] sm:text-xs font-semibold">GCash</div>
              </div>
              <div className="border-2 border-gold bg-gold/10 text-gold p-2.5 sm:p-3 text-center">
                <div className="text-lg mb-0.5">🏦</div>
                <div className="text-[10px] sm:text-xs font-semibold">Maya</div>
              </div>
            </div>
            <p className="text-[11px] sm:text-xs text-white/40 mt-2 leading-relaxed">
              You'll be redirected to PayMongo's secure checkout: QR Ph, GCash, Maya, GrabPay, Cards, BPI, UnionBank, 7-Eleven.
            </p>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-white/60 mb-2 block">Message (optional)</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={200} rows={3}
              placeholder="Add a personal message..." className="form-input resize-none" />
          </div>

          <button onClick={handleCheckout} disabled={loading}
            className="btn-gold w-full flex items-center justify-center gap-2 py-3.5 sm:py-4 disabled:opacity-60 text-base sm:text-lg">
            {loading ? 'Redirecting...' : (<><Lock size={18} /> Pay {formattedAmount()} Securely</>)}
          </button>

          <div className="flex items-center justify-center gap-3 sm:gap-4 text-white/30 text-[10px] sm:text-xs flex-wrap pt-1">
            <span className="flex items-center gap-1"><Lock size={11} /> 256-bit SSL</span>
            <span className="flex items-center gap-1"><Shield size={11} /> BSP Regulated</span>
            <span className="flex items-center gap-1"><Heart size={11} /> Direct to Artists</span>
          </div>
        </div>
      )}
    </div>
  )
}
