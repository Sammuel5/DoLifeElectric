'use client'
import Link from 'next/link'

const faqs = [
  { q: 'How do I send a gift to an artist?', a: 'Click on any artist card on the homepage to watch their opening video. After the video ends (or click the "Gifts" button at any time), select a gift type (🍱 Food, 👗 Clothes, 🎁 Gift, or 💝 Cash), choose an amount in PHP, sign in with Google, and complete payment securely via PayMongo\'s hosted checkout.' },
  { q: 'Do I need to sign in to donate?', a: 'Yes — for security and to prevent fraud, you must sign in with Google before sending money or gifts. This protects both you and our artists from unauthorized transactions.' },
  { q: 'Is my payment information safe?', a: 'Absolutely. All payments are processed through PayMongo, a BSP-licensed, PCI-DSS compliant Philippine payment processor. We never see or store your credit card, CVV, or e-wallet credentials on our servers — all transactions are encrypted end-to-end with TLS, and payment webhooks are verified with HMAC signatures.' },
  { q: 'What payment methods do you accept?', a: 'We accept QR Ph, GCash, Maya, GrabPay, Credit/Debit Cards (Visa/Mastercard/JCB), BPI online banking, UnionBank online banking, and 7-Eleven cash payments — all through PayMongo. All amounts are in Philippine Peso (₱).' },
  { q: 'How does the money reach the artist?', a: 'All funds go directly to DLE Entertainment\'s PayMongo wallet. The company then distributes funds to each artist per their contract. This ensures proper accounting, tax compliance, and security.' },
  { q: 'Can I get a refund?', a: 'If a payment was made in error or an artist is no longer with DLE, contact us at info@dle-entertainment.com with your receipt and we will review refund requests on a case-by-case basis.' },
  { q: 'How do I download music?', a: 'Streaming/previewing is free for everyone. To download tracks, visit the Music page, sign in with Google (click the 🔒 icon), then click the Download button. Downloads are free for personal, non-commercial use only.' },
  { q: 'Can I audition or join DLE?', a: 'We review submissions periodically. Reach out via the Contact page with your portfolio and we will be in touch if there\'s a fit.' },
]

export default function FAQClient() {
  return (
    <div className="relative flex-1 flex flex-col">
      {/* Background layers — cover entire main area (from nav to footer) */}
      <div aria-hidden="true" className="absolute inset-0 bg-black" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/uploads/images/faq-bg.jpg)' }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-black/78" />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.25) 0%, transparent 55%)' }}
      />

      <div className="relative z-10 px-4 sm:px-6 py-8 sm:py-12 md:py-16 max-w-3xl mx-auto w-full">
        <div className="text-center sm:text-left mb-8 sm:mb-10">
          <p className="text-gold text-[10px] sm:text-xs uppercase tracking-[0.4em] sm:tracking-[0.5em] mb-2 sm:mb-3">Support</p>
          <h1 className="font-display font-bold text-white text-4xl sm:text-5xl md:text-6xl uppercase leading-none drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
            Frequently<br className="sm:hidden" /> Asked<br className="sm:hidden" /> <span className="gold-text">Questions</span>
          </h1>
        </div>

        <div className="bg-dark/65 backdrop-blur-sm border border-white/10 overflow-hidden shadow-2xl">
          {faqs.map((f, i) => (
            <details key={i} className={`group ${i !== 0 ? 'border-t border-white/10' : ''}`}>
              <summary className="cursor-pointer list-none p-4 sm:p-5 flex justify-between items-start gap-3 hover:bg-gold/5 transition-colors min-h-[44px]">
                <span className="font-display text-white text-base sm:text-lg uppercase tracking-wide group-hover:text-gold transition-colors leading-tight pt-0.5">{f.q}</span>
                <span className="text-gold text-2xl sm:text-3xl font-light group-open:rotate-45 transition-transform flex-shrink-0 leading-none">+</span>
              </summary>
              <p className="text-white/75 text-sm sm:text-base leading-relaxed px-4 sm:px-5 pb-5 -mt-1">{f.a}</p>
            </details>
          ))}
        </div>

        <p className="text-center text-white/50 text-xs sm:text-sm mt-6 px-4">
          Still have questions? <Link href="/contact" className="text-gold underline hover:text-gold/80">Contact us</Link>.
        </p>
      </div>
    </div>
  )
}
