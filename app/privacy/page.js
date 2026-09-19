export const metadata = { title: 'Privacy Policy — DLE Entertainment' }

export default function PrivacyPage() {
  return (
    <div className="py-16 md:py-24 px-4 sm:px-6 max-w-3xl mx-auto">
      <p className="gold-text text-xs uppercase tracking-[0.4em] mb-3 font-semibold">Legal</p>
      <h1 className="font-display font-bold text-4xl md:text-5xl uppercase leading-none mb-8" style={{ color: 'var(--text)' }}>Privacy <span className="gold-text">Policy</span></h1>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Last updated: {new Date().toLocaleDateString()}</p>

      <h2 className="font-display text-xl uppercase mt-8" style={{ color: 'var(--text)' }}>1. Information We Collect</h2>
      <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>We collect information you provide directly: Google account email and name when you sign in; payment information processed securely by PayMongo (we do not see or store full card numbers, GCash/Maya credentials, or e-wallet details); artist support selections, messages, and contact form submissions.</p>

      <h2 className="font-display text-xl uppercase mt-8" style={{ color: 'var(--text)' }}>2. How We Use Information</h2>
      <ul className="mt-2 list-disc pl-5 space-y-1" style={{ color: 'var(--text-muted)' }}>
        <li>Process gifts and deliver fan support to artists</li>
        <li>Send receipts and transaction confirmations</li>
        <li>Respond to contact form inquiries</li>
        <li>Prevent fraud and secure our platform</li>
        <li>Improve our services and user experience</li>
      </ul>

      <h2 className="font-display text-xl uppercase mt-8" style={{ color: 'var(--text)' }}>3. Google OAuth</h2>
      <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>We use Google for authentication. We receive your basic Google profile (name, email, profile photo) per Google&apos;s OAuth scopes. We do not access your Google account data beyond this.</p>

      <h2 className="font-display text-xl uppercase mt-8" style={{ color: 'var(--text)' }}>4. Payment Information</h2>
      <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>All payment processing is handled by PayMongo, a Bangko Sentral ng Pilipinas (BSP)-licensed payment processor. PayMongo is PCI-DSS compliant and supports Cards, GCash, Maya, GrabPay, online banking (BPI/UnionBank), and 7-Eleven. We receive a transaction ID and amount but never store raw card numbers, CVV, or e-wallet credentials. See <a className="gold-text hover:underline" href="https://www.paymongo.com/privacy" target="_blank" rel="noopener noreferrer">PayMongo&apos;s Privacy Policy</a>.</p>

      <h2 className="font-display text-xl uppercase mt-8" style={{ color: 'var(--text)' }}>5. Data Sharing</h2>
      <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>We do not sell your data. We share limited information only as necessary: with PayMongo for payment processing, with artists (fan name, message, and gift type — not payment details), or when required by law.</p>

      <h2 className="font-display text-xl uppercase mt-8" style={{ color: 'var(--text)' }}>6. Cookies</h2>
      <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>We use secure HTTP-only cookies for session management and CSRF protection. We do not use third-party advertising cookies.</p>

      <h2 className="font-display text-xl uppercase mt-8" style={{ color: 'var(--text)' }}>7. Data Security</h2>
      <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>We employ HTTPS/TLS encryption, secure session tokens, PayMongo webhook HMAC signature verification, input sanitization, and MongoDB access controls to protect your data.</p>

      <h2 className="font-display text-xl uppercase mt-8" style={{ color: 'var(--text)' }}>8. Your Rights</h2>
      <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>You may request access to, correction of, or deletion of your personal data by contacting info@dle-entertainment.com. You may revoke Google OAuth access via your Google Account settings at any time.</p>

      <h2 className="font-display text-xl uppercase mt-8" style={{ color: 'var(--text)' }}>9. Children</h2>
      <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>Our services are not intended for users under 13. We do not knowingly collect data from children under 13.</p>

      <h2 className="font-display text-xl uppercase mt-8" style={{ color: 'var(--text)' }}>10. Contact</h2>
      <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>For privacy inquiries: <a className="gold-text hover:underline" href="mailto:info@dle-entertainment.com">info@dle-entertainment.com</a></p>
    </div>
  )
}
