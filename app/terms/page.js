export const metadata = { title: 'Terms of Service — DLE Entertainment' }

export default function TermsPage() {
  return (
    <div className="py-16 md:py-24 px-4 sm:px-6 max-w-3xl mx-auto max-w-none">
      <p className="gold-text text-xs uppercase tracking-[0.4em] mb-3 font-semibold">Legal</p>
      <h1 className="font-display font-bold text-4xl md:text-5xl uppercase leading-none mb-8" style={{ color: 'var(--text)' }}>Terms of <span className="gold-text">Service</span></h1>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Last updated: {new Date().toLocaleDateString()}</p>

      <h2 className="font-display text-xl uppercase mt-8" style={{ color: 'var(--text)' }}>1. Acceptance of Terms</h2>
      <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>By accessing or using DLE Entertainment&apos;s website and services, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.</p>

      <h2 className="font-display text-xl uppercase mt-8" style={{ color: 'var(--text)' }}>2. Gifts &amp; Fan Support</h2>
      <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>All gifts, and payments made through this platform are voluntary contributions to DLE Entertainment on behalf of artists. Payments are processed securely via PayMongo (a BSP-licensed Philippine payment gateway). All funds are deposited into DLE Entertainment&apos;s PayMongo wallet and distributed to artists per contractual agreements. DLE Entertainment is not a crowdfunding platform and gifts do not constitute investments, purchases of equity, or purchases of goods beyond the symbolic gift recognition.</p>

      <h2 className="font-display text-xl uppercase mt-8" style={{ color: 'var(--text)' }}>3. Payment Security</h2>
      <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>We use PayMongo, a PCI-DSS compliant, BSP-licensed payment processor that supports Cards, GCash, Maya, GrabPay, online banking (BPI/UnionBank), and 7-Eleven. We never see or store your full card number, CVV, or e-wallet credentials on our servers. All transactions are encrypted via TLS/SSL and webhook notifications are verified with HMAC signatures.</p>

      <h2 className="font-display text-xl uppercase mt-8" style={{ color: 'var(--text)' }}>4. Refunds</h2>
      <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>Gifts are generally non-refundable once processed, as they represent voluntary support. If you believe an unauthorized or erroneous charge was made, contact info@dle-entertainment.com within 7 days with your receipt.</p>

      <h2 className="font-display text-xl uppercase mt-8" style={{ color: 'var(--text)' }}>5. Music Content</h2>
      <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>All music available for streaming or download on this site is owned by DLE Entertainment or its licensed artists. Downloads are for personal, non-commercial use only. Distribution, resale, or public performance without permission is prohibited.</p>

      <h2 className="font-display text-xl uppercase mt-8" style={{ color: 'var(--text)' }}>6. User Accounts</h2>
      <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>Google Sign-In is used for authentication. You agree to provide accurate information and are responsible for your account. We reserve the right to suspend accounts engaged in fraud, abuse, or violation of these terms.</p>

      <h2 className="font-display text-xl uppercase mt-8" style={{ color: 'var(--text)' }}>7. Prohibited Conduct</h2>
      <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>You agree not to attempt unauthorized access, interfere with the service, use stolen payment methods, or harass artists or other users. Violations will be reported to law enforcement.</p>

      <h2 className="font-display text-xl uppercase mt-8" style={{ color: 'var(--text)' }}>8. Limitation of Liability</h2>
      <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>DLE Entertainment provides this service &quot;as-is&quot; without warranties. We are not liable for indirect, incidental, or consequential damages arising from use of the platform.</p>

      <h2 className="font-display text-xl uppercase mt-8" style={{ color: 'var(--text)' }}>9. Changes to Terms</h2>
      <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>We may update these terms at any time. Continued use after changes constitutes acceptance.</p>

      <h2 className="font-display text-xl uppercase mt-8" style={{ color: 'var(--text)' }}>10. Contact</h2>
      <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>Questions? Email <a className="gold-text hover:underline" href="mailto:info@dle-entertainment.com">info@dle-entertainment.com</a></p>
    </div>
  )
}
