'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'dle_cookie_consent' // 'accepted' | 'rejected'

/**
 * CookieConsent — slides up from the bottom on first visit and stays until
 * the user clicks Accept All or Reject All. Choice is saved to localStorage
 * so they don't see the banner again. Rejecting does not break login or
 * essential features (we only use essential session cookies anyway — the
 * banner is here for transparency, not for toggling ad trackers).
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show on the client, and only if user hasn't chosen yet
    try {
      const choice = localStorage.getItem(STORAGE_KEY)
      if (choice !== 'accepted' && choice !== 'rejected') {
        // Small delay so it doesn't pop in instantly on page paint
        const t = setTimeout(() => setVisible(true), 600)
        return () => clearTimeout(t)
      }
    } catch (_) {
      // localStorage unavailable (private mode, etc.) — just don't show
    }
  }, [])

  const accept = () => {
    try { localStorage.setItem(STORAGE_KEY, 'accepted') } catch (_) {}
    setVisible(false)
  }

  const reject = () => {
    try { localStorage.setItem(STORAGE_KEY, 'rejected') } catch (_) {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[100] p-3 sm:p-4 md:p-5"
      style={{
        animation: 'dleCookieIn 0.5s cubic-bezier(0.2,0.8,0.2,1) both',
      }}
    >
      <style>{`
        @keyframes dleCookieIn {
          from { transform: translateY(110%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
      <div
        className="mx-auto max-w-3xl rounded-xl shadow-2xl border backdrop-blur-md p-4 sm:p-5 md:p-6"
        style={{
          background: 'rgba(20, 20, 20, 0.92)',
          borderColor: 'rgba(201,168,76,0.35)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.08)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          {/* Cookie icon */}
          <div
            aria-hidden="true"
            className="hidden md:flex w-12 h-12 flex-shrink-0 rounded-full items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #C9A84C 0%, #8A7530 100%)',
              boxShadow: '0 6px 20px rgba(201,168,76,0.35)',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <circle cx="8" cy="9" r="0.8" fill="#0A0A0A" />
              <circle cx="12.5" cy="7.5" r="0.8" fill="#0A0A0A" />
              <circle cx="15.5" cy="10.5" r="0.8" fill="#0A0A0A" />
              <circle cx="9" cy="13" r="0.8" fill="#0A0A0A" />
              <circle cx="14" cy="15" r="0.8" fill="#0A0A0A" />
              <circle cx="11" cy="16.5" r="0.8" fill="#0A0A0A" />
            </svg>
          </div>

          {/* Text */}
          <div className="flex-1">
            <h3
              className="font-display text-white uppercase tracking-wide text-lg sm:text-xl mb-1"
            >
              We Value Your Privacy
            </h3>
            <p className="text-white/80 text-sm leading-relaxed">
              Our website stores data such as cookies to enable essential site
              functionality and improve our services. Please read our{' '}
              <Link
                href="/privacy"
                className="gold-text underline underline-offset-2 hover:opacity-80"
              >
                privacy policy
              </Link>{' '}
              for more information.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={reject}
              className="px-5 py-2.5 text-sm font-semibold uppercase tracking-wider rounded-md transition-colors border"
              style={{
                color: 'rgba(255,255,255,0.75)',
                borderColor: 'rgba(255,255,255,0.25)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)' }}
            >
              Reject All
            </button>
            <button
              type="button"
              onClick={accept}
              className="px-5 py-2.5 text-sm font-bold uppercase tracking-wider rounded-md transition-colors"
              style={{
                color: '#0A0A0A',
                background: 'linear-gradient(180deg, #E6C76A 0%, #C9A84C 100%)',
                boxShadow: '0 4px 14px rgba(201,168,76,0.3)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(180deg, #f0d57a 0%, #d6b558 100%)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(180deg, #E6C76A 0%, #C9A84C 100%)' }}
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
