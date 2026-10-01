export const metadata = { title: 'Terms of Service — DLE Entertainment' }

const H2 = ({ children }) => (
  <h2 className="font-display text-xl md:text-2xl uppercase tracking-wide mt-10" style={{ color: 'var(--text)' }}>{children}</h2>
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

export default function TermsPage() {
  return (
    <div className="py-16 md:py-24 px-4 sm:px-6 max-w-3xl mx-auto">
      <p className="gold-text text-xs uppercase tracking-[0.4em] mb-3 font-semibold">Legal</p>
      <h1 className="font-display font-bold text-4xl md:text-5xl uppercase leading-none mb-6" style={{ color: 'var(--text)' }}>
        Terms of <span className="gold-text">Service</span>
      </h1>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Last updated: September 28, 2026</p>

      <P>
        Welcome to DLE Entertainment. These Terms of Service ("Terms") govern your access to and use of
        <A href="https://dle-entertainment.com"> dle-entertainment.com</A> (the "Site"), including all content, functionality,
        music streaming and downloads, artist pages, gift/support transactions, and related services operated by DLE Entertainment
        ("DLE", "we", "us", or "our").
      </P>
      <P>
        <strong>Please read these Terms carefully before using the Site.</strong> By accessing, browsing, or using the Site,
        you agree to be bound by these Terms and our <A href="/privacy">Privacy Policy</A>. If you do not agree to these
        Terms, please do not use the Site.
      </P>

      <H2>1. Eligibility &amp; Accounts</H2>
      <P>
        You must be at least eighteen (18) years old, or the age of majority in your jurisdiction, to use the Site and to make
        payments. If you are between thirteen (13) and the age of majority, you may use the Site only with the supervision and
        consent of a parent or legal guardian, who agrees to be bound by these Terms on your behalf. Users under thirteen (13)
        are not permitted to use the Site.
      </P>
      <P>
        Certain features (contact form, gift/support payments, admin tools) require sign-in via Google OAuth. You agree to
        provide accurate information, maintain the security of your account, and promptly notify us of any unauthorized use.
        You are responsible for all activity under your account.
      </P>

      <H2>2. Site Content &amp; Intellectual Property</H2>
      <P>
        All content on the Site — including music, audio recordings, video, artist names, logos, trademarks, artwork, photographs,
        text, graphics, page design, and software — is owned by DLE Entertainment, its artists, or our licensors, and is protected
        by copyright, trademark, and other intellectual property laws of the Republic of the Philippines and international treaties.
      </P>
      <P>
        We grant you a limited, non-exclusive, non-transferable, revocable license to access the Site and stream/download content
        for your own personal, non-commercial use. You may not, without our prior written permission:
      </P>
      <UL>
        <li>Reproduce, distribute, publicly perform, or publicly display any music, video, or artwork</li>
        <li>Modify, create derivative works of, or exploit any Site content for commercial purposes</li>
        <li>Remove any copyright, trademark, or proprietary notice</li>
        <li>Circumvent, disable, or interfere with security features, rate-limiting, or access controls</li>
        <li>Scrape, crawl, or data-mine the Site, including the music/artist APIs, except for legitimate search engine indexing</li>
        <li>Use the DLE Entertainment name, logo, or artist likenesses to endorse any product or service</li>
      </UL>

      <H2>3. Gifts &amp; Fan Support</H2>
      <P>
        The Site allows you to send voluntary monetary gifts ("Gifts") to support artists via PayMongo. Gifts are:
      </P>
      <UL>
        <li><strong>Voluntary contributions.</strong> Gifts are not purchases of goods, services, equity, securities, or investments.
          You are not buying ownership in an artist, a share of revenue, or any entitlement to future income.</li>
        <li><strong>Non-reciprocal.</strong> Artists may, in their discretion, acknowledge a Gift (e.g. a shout-out or message), but
          no artist is obligated to provide any specific deliverable, content, or personal interaction in exchange for a Gift.</li>
        <li><strong>Processed by PayMongo.</strong> All payments are handled by PayMongo, a BSP-licensed payment processor. Payment
          methods supported include Visa/Mastercard, GCash, Maya, GrabPay, BPI/UnionBank online banking, and 7-Eleven.</li>
        <li><strong>Distributed to artists.</strong> Net amounts (after PayMongo fees and DLE's agreed management share, per the
          artist's contract) are distributed to the artist according to their agreement with DLE Entertainment.</li>
      </UL>

      <H2>4. Pricing, Fees &amp; Currency</H2>
      <P>
        Gift amounts are displayed in Philippine Pesos (₱/PHP) unless explicitly noted otherwise. You will be charged in PHP at the
        time of checkout. Any foreign-exchange fees are determined by your card issuer or e-wallet. PayMongo's processing fees and
        any applicable convenience fees are disclosed at checkout before you confirm payment.
      </P>

      <H2>5. Refunds</H2>
      <P>
        Gifts are generally <strong>final and non-refundable</strong> once processed, as they represent voluntary, non-reciprocal
        support that may be forwarded to the artist quickly after settlement. Refunds may be issued — at our sole discretion — in
        the following cases:
      </P>
      <UL>
        <li>Duplicate or clearly erroneous transactions charged to your account</li>
        <li>Unauthorized use of your payment method (report to us and to PayMongo/card issuer within 7 days)</li>
        <li>Failure of the payment to be successfully delivered to DLE due to a confirmed technical error</li>
      </UL>
      <P>
        To request a refund, email <A href="mailto:info@dle-entertainment.com">info@dle-entertainment.com</A> with your PayMongo
        reference number within seven (7) days of the transaction. We will investigate and respond within thirty (30) days.
        Chargebacks filed without first contacting us may result in account suspension while the dispute is reviewed.
      </P>

      <H2>6. Music Streaming &amp; Downloads</H2>
      <P>
        Music made available on the Site is provided for your personal enjoyment. Streaming is free where enabled. Paid downloads
        (if offered) are licensed for personal, non-commercial use only. You may not upload DLE music to third-party platforms
        (YouTube, TikTok, Spotify, Apple Music, etc.), distribute via torrent/file-sharing networks, sample, or remix without
        explicit written permission from DLE Entertainment and the relevant artist.
      </P>

      <H2>7. User Conduct</H2>
      <P>By using the Site, you agree not to:</P>
      <UL>
        <li>Use the Site for any illegal purpose or in violation of any applicable law</li>
        <li>Submit harassing, threatening, defamatory, obscene, or abusive messages to artists or other users</li>
        <li>Impersonate another person or misrepresent your affiliation with any person or entity</li>
        <li>Attempt to gain unauthorized access to administrative areas, other user accounts, or backend systems</li>
        <li>Interfere with or disrupt the security, performance, or availability of the Site (including denial-of-service attacks,
          bot flooding, or automated scraping that degrades service for others)</li>
        <li>Use stolen payment instruments, chargeback fraud, or any method to obtain services dishonestly</li>
        <li>Upload or transmit malware, viruses, or malicious code</li>
      </UL>
      <P>We reserve the right to suspend or terminate access for users who violate these rules, and to report illegal activity to law enforcement.</P>

      <H2>8. Artist Content &amp; Submissions</H2>
      <P>
        Artists on the platform are independent or signed talents working with DLE Entertainment. Artists represent and warrant that
        they have all necessary rights to the music, video, images, and bios they upload, and that their content does not infringe
        third-party rights or violate applicable law. If you believe content on the Site infringes your copyright, see Section 11
        (DMCA / Copyright Policy).
      </P>

      <H2>9. Third-Party Services</H2>
      <P>
        The Site relies on third-party service providers including, but not limited to: Vercel (hosting), MongoDB Atlas (database),
        Cloudinary (media CDN), PayMongo (payments), Google (OAuth), and Resend (email). Your use of their services is subject to
        their respective terms and policies. We are not responsible for the availability, accuracy, or policies of third-party services.
      </P>

      <H2>10. Disclaimers &amp; Warranties</H2>
      <P>
        THE SITE AND ALL CONTENT ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR
        STATUTORY. TO THE FULLEST EXTENT PERMITTED BY LAW, DLE ENTERTAINMENT DISCLAIMS ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF
        MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. We do not warrant that the Site will be uninterrupted,
        error-free, secure, or free of viruses or harmful components; that defects will be corrected; or that the music, video, or artist
        content will always be available.
      </P>

      <H2>11. DMCA / Copyright Complaint Policy</H2>
      <P>
        If you believe content on the Site infringes your copyright, you may send a notice to
        <A href="mailto:info@dle-entertainment.com"> info@dle-entertainment.com</A> that includes: (a) your name and contact
        information; (b) a description of the copyrighted work and the URL where it appears; (c) a statement made under penalty of perjury
        that you are the rights owner or authorized to act on their behalf; and (d) your physical or electronic signature. We will respond
        to valid notices promptly and remove or disable access to infringing material in accordance with applicable law.
      </P>

      <H2>12. Limitation of Liability</H2>
      <P>
        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, DLE ENTERTAINMENT, ITS OFFICERS, DIRECTORS, EMPLOYEES, CONTRACTORS, ARTISTS,
        AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF
        PROFITS, REVENUE, DATA, GOODWILL, OR BUSINESS OPPORTUNITY ARISING OUT OF OR RELATING TO YOUR USE OF THE SITE OR THESE TERMS,
        EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL AGGREGATE LIABILITY TO YOU FOR ANY CLAIM ARISING OUT OF THESE TERMS
        SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO DLE IN THE NINETY (90) DAYS PRIOR TO THE CLAIM OR (B) ONE THOUSAND
        PESOS (₱1,000).
      </P>

      <H2>13. Indemnification</H2>
      <P>
        You agree to indemnify, defend, and hold harmless DLE Entertainment, its officers, directors, employees, artists, and affiliates
        from and against any and all claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising
        out of or related to: (a) your use of the Site; (b) your violation of these Terms; (c) your violation of any law or third-party
        right; (d) any content you submit or transmit through the Site.
      </P>

      <H2>14. Termination</H2>
      <P>
        You may stop using the Site at any time. We may suspend or terminate your access — with or without notice — if we reasonably
        believe you have violated these Terms, engaged in fraud, posed a security risk, or for any other reason at our sole discretion.
        Sections that by their nature should survive termination (ownership, disclaimers, liability limits, indemnification, governing
        law) will survive.
      </P>

      <H2>15. Governing Law &amp; Dispute Resolution</H2>
      <P>
        These Terms are governed by and construed in accordance with the laws of the Republic of the Philippines, without regard to
        its conflict-of-laws principles. Any dispute arising out of or relating to these Terms or your use of the Site shall first be
        resolved amicably through good-faith negotiation for at least thirty (30) days. If unresolved, disputes shall be submitted to
        the exclusive jurisdiction of the proper courts of Quezon City, Metro Manila, Philippines. Nothing in this section limits
        your rights as a consumer under mandatory consumer-protection laws.
      </P>

      <H2>16. Changes to These Terms</H2>
      <P>
        We may update these Terms from time to time. When we do, we will revise the "Last updated" date at the top of this page. For
        material changes, we will post a notice on the Site or notify you by email (if you have an account). Your continued use of
        the Site after changes become effective constitutes acceptance of the revised Terms.
      </P>

      <H2>17. Severability</H2>
      <P>
        If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the
        minimum extent necessary, and the remaining provisions shall remain in full force and effect.
      </P>

      <H2>18. Entire Agreement</H2>
      <P>
        These Terms, together with our <A href="/privacy">Privacy Policy</A> and any artist-specific agreements you may enter into
        directly with DLE, constitute the entire agreement between you and DLE Entertainment regarding your use of the Site, and
        supersede any prior oral or written agreements.
      </P>

      <H2>19. Contact</H2>
      <P>For questions about these Terms, please contact us:</P>
      <UL>
        <li>By email: <A href="mailto:info@dle-entertainment.com">info@dle-entertainment.com</A></li>
        <li>Through our Site's <A href="/contact">Contact page</A></li>
      </UL>
    </div>
  )
}
