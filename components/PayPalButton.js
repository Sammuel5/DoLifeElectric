'use client'
import { useEffect, useRef, useState } from 'react'
import { isPayPalConfigured, getPayPalClientId, getPayPalEnvironment } from '@/lib/paypal-client'

/**
 * PayPalButton — renders PayPal Smart Payment Buttons inside an iframe/popup.
 * Props:
 *   artist, giftType, amountPesos, message: form data (same as PayMongo flow)
 *   disabled: boolean (true while submitting other provider)
 *   onStart: () => void
 *   onSuccess: ({ donationId }) => void  — fires when payment completes
 *   onError: (msg) => void
 *   onCancel: () => void
 */
export default function PayPalButton({
  artist,
  giftType,
  amountPesos,
  message,
  disabled,
  onStart,
  onSuccess,
  onError,
  onCancel,
}) {
  const containerRef = useRef(null)
  const buttonsRenderedRef = useRef(false)
  const [sdkReady, setSdkReady] = useState(false)
  const [sdkError, setSdkError] = useState(false)

  // Load PayPal JS SDK script once on mount (if configured)
  useEffect(() => {
    const clientId = getPayPalClientId()
    if (!clientId || !isPayPalConfigured()) {
      setSdkError(true)
      return
    }
    const existing = document.getElementById('paypal-js-sdk')
    if (existing) {
      if (window.paypal) setSdkReady(true)
      return
    }
    const script = document.createElement('script')
    script.id = 'paypal-js-sdk'
    script.src = `https://www.${getPayPalEnvironment() === 'live' ? 'paypal.com' : 'sandbox.paypal.com'}/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=PHP&intent=capture&commit=true&locale=en_PH`
    script.async = true
    script.onload = () => setSdkReady(true)
    script.onerror = () => setSdkError(true)
    document.body.appendChild(script)
  }, [])

  // Render buttons when SDK is ready and container exists
  useEffect(() => {
    if (!sdkReady || !containerRef.current || buttonsRenderedRef.current || disabled) return
    if (!window.paypal?.Buttons) return

    try {
      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'pay',
          height: 42,
          tagline: false,
        },
        createOrder: async () => {
          try {
            onStart?.()
            const res = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                artistId: artist?._id || null,
                giftType,
                amountPesos: Number(amountPesos),
                message: message || '',
              }),
            })
            const data = await res.json()
            if (!res.ok || !data.orderId) {
              onError?.(data.error || 'Could not create PayPal order')
              throw new Error(data.error || 'create-order failed')
            }
            // Store donationId on the container so onApprove can read it
            containerRef.current?.setAttribute('data-donation-id', data.donationId)
            return data.orderId
          } catch (e) {
            onError?.(e.message)
            throw e
          }
        },
        onApprove: async (data) => {
          try {
            const donationId = containerRef.current?.getAttribute('data-donation-id')
            const res = await fetch(`/api/paypal/capture-order/${donationId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: data.orderID }),
            })
            const resData = await res.json()
            if (!res.ok) {
              onError?.(resData.error || 'Payment capture failed')
              return
            }
            if (resData.status === 'completed') {
              onSuccess?.({ donationId })
            } else {
              onError?.(`Payment not completed (status: ${resData.status})`)
            }
          } catch (e) {
            onError?.(e.message)
          }
        },
        onCancel: () => {
          onCancel?.()
        },
        onError: (err) => {
          console.error('[paypal] button onError:', err)
          onError?.('PayPal encountered an error. Please try again.')
        },
      }).render(containerRef.current)
      buttonsRenderedRef.current = true
    } catch (e) {
      console.error('[paypal] render error:', e)
      setSdkError(true)
    }
  }, [sdkReady, disabled, artist, giftType, amountPesos, message, onStart, onSuccess, onError, onCancel])

  if (sdkError) {
    return null // PayPal not configured or failed to load — hide the option entirely
  }

  return (
    <div style={{ position: 'relative', minHeight: 46 }}>
      <div ref={containerRef} />
      {!sdkReady && (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12, padding: '12px 0' }}>
          Loading PayPal…
        </div>
      )}
    </div>
  )
}
