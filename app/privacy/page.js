export const metadata = { title: 'Privacy Policy — DLE Entertainment' }

const H2 = ({ children }) => (
  <h2 className="font-display text-xl md:text-2xl uppercase tracking-wide mt-10" style={{ color: 'var(--text)' }}>
    {children}
  </h2>
)
const P = ({ children }) => (
  <p className="mt-3 leading-relaxed text-[15px] md:text-base" style={{ color: 'var(--text-muted)' }}>{children}</p>
)
const UL = ({ children }) => (
  <ul className="mt-3 list-disc pl-6 space-y-2 text-[15px] md:text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
    {children}
  </ul>
)
const A = ({ href, children }) => (
  <a className="gold-text hover:underline underline-offset-2" href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{children}</a>
)

export default function PrivacyPage() {
  return (
    <div className="py-16 md:py-24 px-4 sm:px-6 max-w-3xl mx-auto">
      <p className="gold-text text-xs uppercase tracking-[0.4em] mb-3 font-semibold">Legal</p>
      <h1 className="font-display font-bold text-4xl md:text-5xl uppercase leading-none mb-6" style={{ color: 'var(--text)' }}>
        Privacy <span className="gold-text">Policy</span>
      </h1>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Last updated: September 28, 2026</p>

      <P>
        DLE Entertainment ("DLE", "we", "us", or "our") operates <A href="https://dle-entertainment.com">dle-entertainment.com</A> (the "Site").
        This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit the Site, sign in, stream or
        download music, or send gifts/support to our artists. Please read this policy carefully. By using the Site, you consent to the practices
        described below.
      </P>

      <H2>1. Information We Collect</H2>
      <P>We collect information in three categories:</P>
      <UL>
        <li><strong>Information you provide directly.</strong> When you sign in via Google, we receive your basic Google profile — your name,
          email address, and profile photo — as permitted by Google's OAuth scopes. When you submit a contact form, send a gift to an artist,
          or correspond with us by email, we collect the content of that message along with your name, email, and any PayMongo reference numbers.</li>
        <li><strong>Payment information.</strong> All payments (cards, GCash, Maya, GrabPay, online banking, 7-Eleven) are processed by PayMongo,
          a Bangko Sentral ng Pilipinas (BSP)-licensed payment gateway. PayMongo is PCI-DSS Level 1 compliant. We receive a transaction ID,
          amount, and payment status; we <em>do not</em> receive, process, or store full card numbers, CVV codes, or e-wallet credentials.</li>
        <li><strong>Automatically collected information.</strong> When you visit the Site, our servers and third-party service providers
          automatically receive standard technical data such as your IP address, browser type, device type, referring/exit pages, operating
          system, and date/time stamps. This data is used in aggregate to keep the Site secure and performant.</li>
      </UL>

      <H2>2. Cookies &amp; Similar Technologies</H2>
      <P>
        We use cookies — small text files stored on your device — to make the Site work properly. You can accept or reject non-essential
        cookies via the consent banner displayed on your first visit. We use the following categories:
      </P>
      <UL>
        <li><strong>Essential cookies (always active).</strong> Required to sign you in, keep you signed in, protect against cross-site
          request forgery, and remember your cookie consent choice. The Site cannot function properly without these.</li>
        <li><strong>Preference cookies (optional).</strong> Remember your theme choice (dark/light mode) and player settings.</li>
        <li><strong>Analytics cookies (optional, currently disabled by default).</strong> If enabled in the future, they will help us
          understand traffic patterns in aggregate. We do not sell advertising and do not use third-party ad-tracking cookies.</li>
      </UL>
      <P>
        You may control cookies through your browser settings, but please note that disabling essential cookies may prevent sign-in and
        checkout from working.
      </P>

      <H2>3. How We Use Your Information</H2>
      <P>We use the information we collect to:</P>
      <UL>
        <li>Create and maintain your account and authenticate sign-ins via Google</li>
        <li>Process gift transactions and deliver fan support to artists</li>
        <li>Send receipts, transaction confirmations, and responses to your inquiries</li>
        <li>Operate, maintain, and improve the Site (debugging, performance analysis, abuse prevention)</li>
        <li>Comply with applicable laws, regulations, and lawful requests from authorities</li>
        <li>Detect and prevent fraud, unauthorized transactions, and other illegal activity</li>
      </UL>
      <P>We do <em>not</em> sell your personal information to third parties.</P>

      <H2>4. Information Sharing &amp; Third-Party Services</H2>
      <P>We share personal information only with the following categories of recipients, and only to the extent necessary:</P>
      <UL>
        <li><strong>PayMongo</strong> — to process payments. See <A href="https://www.paymongo.com/privacy">PayMongo's Privacy Policy</A>.</li>
        <li><strong>Google</strong> — to provide authentication. See <A href="https://policies.google.com/privacy">Google's Privacy Policy</A>.</li>
        <li><strong>Cloudinary</strong> — to host and stream images, audio, and video. Media is served via public CDN URLs; no visitor
          PII is sent to Cloudinary other than the IP address making the HTTP request, as is normal for any CDN.
          See <A href="https://cloudinary.com/privacy">Cloudinary's Privacy Policy</A>.</li>
        <li><strong>Vercel</strong> — our hosting provider, which serves the Site and delivers server-rendered pages. See <A href="https://vercel.com/legal/privacy-policy">Vercel's Privacy Policy</A>.</li>
        <li><strong>MongoDB Atlas</strong> — our cloud database provider, where account, transaction, and content data is stored at rest
          with encryption. See <A href="https://www.mongodb.com/legal/privacy-policy">MongoDB's Privacy Policy</A>.</li>
        <li><strong>Artists</strong> — when you send a gift with a message, we share your chosen display name, message, and gift type
          with the receiving artist so they can thank you. We do not share your email address, payment details, or Google account ID with artists.</li>
        <li><strong>Authorities</strong> — when required by law, court order, or to protect our rights, users, or the public.</li>
      </UL>

      <H2>5. Google Sign-In &amp; OAuth</H2>
      <P>
        We use Google's OAuth 2.0 service to authenticate sign-ins. We request only the minimal profile scopes (name, email, profile picture).
        We do not access your Google Drive, Gmail, Calendar, or any other Google Account data. You may revoke our access at any time from
        your <A href="https://myaccount.google.com/permissions">Google Account Permissions</A> page. Revoking access will prevent you from
        signing in to the Site but will not delete your DLE account — contact us to request account deletion.
      </P>

      <H2>6. Payment Processing (PayMongo)</H2>
      <P>
        All payments are processed by PayMongo Payments, Inc., a regulated electronic money issuer and operator of payment systems
        supervised by the Bangko Sentral ng Pilipinas (BSP). Transactions are encrypted in transit using TLS. We store only the PayMongo
        transaction reference and payment status in our database. For questions about a payment, you may also contact PayMongo directly
        at <A href="https://www.paymongo.com">paymongo.com</A>.
      </P>

      <H2>7. Data Retention</H2>
      <P>
        We retain personal information for as long as your account is active or as needed to provide you services, comply with legal
        obligations, resolve disputes, and enforce our agreements. Transaction records are retained for a minimum of ten (10) years in
        accordance with Philippine tax and accounting requirements. Contact form messages are retained for up to two (2) years after closure
        of the inquiry, after which they are anonymized or deleted.
      </P>

      <H2>8. Data Security</H2>
      <P>
        We implement industry-standard security measures including HTTPS/TLS 1.2+ encryption for all traffic, secure HTTP-only session
        cookies with SameSite protection, HMAC-signed PayMongo webhook verification, role-based access controls for administrators,
        hashed credentials, MongoDB network access controls, and regular dependency updates. No system is 100% secure, but we take
        reasonable and appropriate steps to protect your personal information.
      </P>

      <H2>9. Children's Privacy</H2>
      <P>
        The Site is not intended for children under the age of thirteen (13). We do not knowingly collect personal information from children
        under 13. If you believe a child has provided us with personal information, please contact us at the email below and we will
        promptly delete it.
      </P>

      <H2>10. Your Rights</H2>
      <P>Subject to applicable law (including the Philippine Data Privacy Act of 2012 and, where applicable, the EU GDPR), you have the right to:</P>
      <UL>
        <li>Request access to the personal information we hold about you</li>
        <li>Request correction of inaccurate or incomplete information</li>
        <li>Request deletion of your personal information, subject to legal retention obligations</li>
        <li>Object to or restrict certain types of processing (e.g. marketing)</li>
        <li>Withdraw consent (for cookies, use the banner or your browser controls; for Google sign-in, revoke access via your Google Account)</li>
        <li>Lodge a complaint with your local data protection authority if you are unsatisfied with our response</li>
      </UL>
      <P>To exercise any of these rights, email us at <A href="mailto:info@dle-entertainment.com">info@dle-entertainment.com</A>.
        We will respond within thirty (30) days.</P>

      <H2>11. Third-Party Links</H2>
      <P>
        The Site may contain links to third-party websites (artist social media, payment processors, etc.). We are not responsible for
        the privacy practices of those sites. We encourage you to read the privacy policy of every website you visit.
      </P>

      <H2>12. International Data Transfers</H2>
      <P>
        Our hosting (Vercel), database (MongoDB Atlas), media CDN (Cloudinary), and payment processor (PayMongo) operate infrastructure
        across multiple regions. By using the Site, you consent to the transfer of your information to countries that may have different
        data protection laws than your country of residence, in all cases subject to appropriate safeguards (Standard Contractual Clauses,
        PCI-DSS, and the privacy policies referenced above).
      </P>

      <H2>13. Changes to This Policy</H2>
      <P>
        We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or legal requirements. When
        we do, we will revise the "Last updated" date at the top of this page and, for material changes, place a notice on the Site. Your
        continued use of the Site after changes become effective constitutes acceptance of the updated policy.
      </P>

      <H2>14. Contact Us</H2>
      <P>
        If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
      </P>
      <UL>
        <li>By email: <A href="mailto:info@dle-entertainment.com">info@dle-entertainment.com</A></li>
        <li>Through our Site's <A href="/contact">Contact page</A></li>
      </UL>
    </div>
  )
}
