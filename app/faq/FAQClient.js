'use client'
import Link from 'next/link'

const faqs = [
  { q: 'HOW DO I SEND A GIFT TO AN ARTIST?', a: 'Click on any artist card on the homepage to watch their opening video. After the video ends (or click the "Gifts" button at any time), select a gift type (Food, Clothes, Gift, or Cash), choose an amount in PHP, sign in with Google, and complete payment securely via PayMongo\'s hosted checkout.' },
  { q: 'DO I NEED TO SIGN IN TO SEND GIFTS?', a: 'Yes — for security and to prevent fraud, you must sign in with Google before sending money or gifts. This protects both you and our artists from unauthorized transactions.' },
  { q: 'IS MY PAYMENT INFORMATION SAFE?', a: 'Absolutely. All payments are processed through PayMongo, a BSP-licensed, PCI-DSS compliant Philippine payment processor. We never see or store your credit card, CVV, or e-wallet credentials on our servers — all transactions are encrypted end-to-end with TLS, and payment webhooks are verified with HMAC signatures.' },
  { q: 'WHAT PAYMENT METHODS DO YOU ACCEPT?', a: 'We accept QR Ph, GCash, Maya, GrabPay, Credit/Debit Cards (Visa/Mastercard/JCB), BPI online banking, UnionBank online banking, and 7-Eleven cash payments — all through PayMongo. All amounts are in Philippine Peso (₱).' },
  { q: 'HOW DOES THE MONEY REACH THE ARTIST?', a: 'All funds go directly to DLE Entertainment\'s PayMongo wallet. The company then distributes funds to each artist per their contract. This ensures proper accounting, tax compliance, and security.' },
  { q: 'CAN I GET A REFUND?', a: 'If a payment was made in error or an artist is no longer with DLE, contact us at info@dle-entertainment.com with your receipt and we will review refund requests on a case-by-case basis.' },
  { q: 'HOW DO I DOWNLOAD MUSIC?', a: 'Streaming/previewing is free for everyone. To download tracks, visit the Music page, sign in with Google (click the lock icon), then click the Download button. Downloads are free for personal, non-commercial use only.' },
  { q: 'CAN I AUDITION OR JOIN DLE?', a: 'We review submissions periodically. Reach out via the Contact page with your portfolio and we will be in touch if there\'s a fit.' },
]

export default function FAQClient() {
  return (
    <div className="relative flex-1 flex flex-col cinematic-dark"
      style={{ minHeight: 'calc(100dvh - var(--nav-h))' }}>
      {/* Black leather texture background */}
      <div aria-hidden="true" className="absolute inset-0 bg-[#0a0806]" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/dark-texture.webp)' }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-black/40" />

      {/* Content wrapper */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-start px-4 sm:px-6 py-10 sm:py-14 md:py-20">
        {/* Outer container: header overlaps the card */}
        <div className="relative w-full max-w-[880px] mx-auto mt-4 md:mt-6">
          {/* HEADER BAR — dark olive-bronze pill on top, slightly overlapping */}
          <div
            className="relative z-20 mx-auto w-[94%] md:w-[88%] rounded-xl px-5 py-3 md:py-4 text-center shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
            style={{
              background:
                'linear-gradient(180deg, #6B5A20 0%, #5A4B1B 50%, #4A3D16 100%)',
              border: '1px solid rgba(201,168,76,0.35)',
              borderBottom: '1px solid rgba(0,0,0,0.4)',
            }}
          >
            <h1
              className="font-display font-bold uppercase text-white leading-tight"
              style={{ fontSize: 'clamp(24px, 6.5vw, 40px)', letterSpacing: '0.05em', textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}
            >
              FREQUENTLY ASKED QUESTIONS
            </h1>
          </div>

          {/* YELLOW-GOLD CONTENT CARD — yellow-tinted leather texture inside */}
          <div
            className="relative -mt-2 md:-mt-3 rounded-xl overflow-hidden"
            style={{
              border: '3px solid #B89540',
              boxShadow:
                '0 0 0 1px rgba(201,168,76,0.25), 0 25px 70px rgba(0,0,0,0.55), inset 0 0 80px rgba(0,0,0,0.45)',
            }}
          >
            {/* Leather dark-texture inside the yellow box */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: 'url(/dark-texture.webp)' }}
            />
            {/* Yellow-tint wash over the leather so the box stays gold/yellow — darker so texture shows through */}
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(95,75,22,0.88) 0%, rgba(82,64,18,0.90) 50%, rgba(70,54,15,0.92) 100%)',
              }}
            />
            {/* Yellow gold inner glow/light-sheen */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 0%, rgba(220,185,90,0.22) 0%, rgba(0,0,0,0) 55%)',
              }}
            />

            <div className="relative pt-5 sm:pt-8 md:pt-10 pb-8 md:pb-10 px-4 sm:px-7 md:px-14">
              {faqs.map((f, i) => (
                <details key={i} className="group faq-item">
                  <summary
                    className="cursor-pointer list-none py-5 sm:py-5 md:py-[18px] text-center select-none transition-colors hover:text-white"
                    style={{ listStyle: 'none' }}
                  >
                    <span
                      className="font-display uppercase text-white/95 leading-snug block group-hover:text-white"
                      style={{ fontSize: 'clamp(20px, 5.2vw, 24px)', letterSpacing: '0.04em', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
                    >
                      {f.q}
                    </span>
                  </summary>
                  <div className="faq-answer overflow-hidden max-h-0 group-open:max-h-[900px] transition-all duration-500 ease-in-out">
                    <p
                      className="text-white/90 text-center leading-relaxed pb-5 sm:pb-6 max-w-2xl mx-auto"
                      style={{ fontSize: 'clamp(17px, 4.3vw, 18px)', lineHeight: 1.6, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      {f.a}
                    </p>
                  </div>
                  {/* One divider line BELOW each question (between questions) — always visible */}
                  <div
                    className="h-[2px] w-full"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 12%, rgba(255,255,255,0.8) 88%, transparent 100%)',
                    }}
                  />
                </details>
              ))}

              {/* Still have questions */}
              <div className="text-center mt-7 sm:mt-8 md:mt-8 px-2">
                <p
                  className="text-white leading-snug"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 'clamp(19px, 5vw, 28px)',
                    textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                  }}
                >
                  Still have questions?{' '}
                  <Link
                    href="/contact"
                    className="text-white font-bold underline underline-offset-4 decoration-white hover:text-gold hover:decoration-gold transition-colors"
                  >
                    Contact us.
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .faq-item summary::-webkit-details-marker { display: none; }
        .faq-item summary::marker { display: none; content: ''; }
      `}</style>
    </div>
  )
}
