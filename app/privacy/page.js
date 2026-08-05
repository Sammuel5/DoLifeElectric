export const metadata = { title: 'Privacy Policy — DLE Entertainment' }

export default function PrivacyPage() {
  return (
    <div className="py-16 md:py-24 px-4 sm:px-6 max-w-3xl mx-auto prose prose-invert prose-sm max-w-none">
      <p className="text-gold text-xs uppercase tracking-[0.4em] mb-3">Legal</p>
      <h1 className="font-display font-bold text-white text-4xl md:text-5xl uppercase leading-none mb-8">Privacy <span className="gold-text">Policy</span></h1>
      <p className="text-white/50 text-sm">Last updated: {new Date().toLocaleDateString()}</p>

      <h2 className="font-display text-xl uppercase text-white mt-8">1. Information We Collect</h2>
      <p className="text-white/70">We collect information you provide directly: Google account email and name when you sign in; payment information processed securely by PayMongo (we do not see or store full card numbers, GCash/Maya credentials, or e-wallet details); artist support selections, messages, and contact form submissions.</p>

      <h2 className="font-display text-xl uppercase text-white mt-8">2. How We Use Information</h2>
      <ul className="text-white/70 list-disc pl-5 space-y-1">
        <li>Process donations and deliver fan support to artists</li>
        <li>Send receipts and transaction confirmations</li>
        <li>Respond to contact form inquiries</li>
        <li>Prevent fraud and secure our platform</li>
        <li>Improve our services and user experience</li>
      </ul>

      <h2 className="font-display text-xl uppercase text-white mt-8">3. Google OAuth</h2>
      <p className="text-white/70">We use Google for authentication. We receive your basic Google profile (name, email, profile photo) per Google's OAuth scopes. We do not access your Google account data beyond this.</p>

      <h2 className="font-display text-xl uppercase text-white mt-8">4. Payment Information</h2>
      <p className="text-white/70">All payment processing is handled by PayMongo, a Bangko Sentral ng Pilipinas (BSP)-licensed payment processor. PayMongo is PCI-DSS compliant and supports Cards, GCash, Maya, GrabPay, online banking (BPI/UnionBank), and 7-Eleven. We receive a transaction ID and amount but never store raw card numbers, CVV, or e-wallet credentials. See <a className="text-gold" href="https://www.paymongo.com/privacy" target="_blank" rel="noopener noreferrer">PayMongo's Privacy Policy</a>.</p>

      <h2 className="font-display text-xl uppercase text-white mt-8">5. Data Sharing</h2>
      <p className="text-white/70">We do not sell your data. We share limited information only as necessary: with PayMongo for payment processing, with artists (fan name, message, and gift type — not payment details), or when required by law.</p>

      <h2 className="font-display text-xl uppercase text-white mt-8">6. Cookies</h2>
      <p className="text-white/70">We use secure HTTP-only cookies for session management and CSRF protection. We do not use third-party advertising cookies.</p>

      <h2 className="font-display text-xl uppercase text-white mt-8">7. Data Security</h2>
      <p className="text-white/70">We employ HTTPS/TLS encryption, secure session tokens, PayMongo webhook HMAC signature verification, input sanitization, and MongoDB access controls to protect your data.</p>

      <h2 className="font-display text-xl uppercase text-white mt-8">8. Your Rights</h2>
      <p className="text-white/70">You may request access to, correction of, or deletion of your personal data by contacting info@dle-entertainment.com. You may revoke Google OAuth access via your Google Account settings at any time.</p>

      <h2 className="font-display text-xl uppercase text-white mt-8">9. Children</h2>
      <p className="text-white/70">Our services are not intended for users under 13. We do not knowingly collect data from children under 13.</p>

      <h2 className="font-display text-xl uppercase text-white mt-8">10. Contact</h2>
      <p className="text-white/70">For privacy inquiries: <a className="text-gold" href="mailto:info@dle-entertainment.com">info@dle-entertainment.com</a></p>
    </div>
  )
}
