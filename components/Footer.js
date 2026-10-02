'use client'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer
      style={{
        background: 'var(--bg-elev)',
        borderTop: '1px solid var(--border)',
        transition: 'background 0.4s ease, border-color 0.4s ease',
      }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="inline-block mb-4 group">
              <img
                src="/dlelogo/dle-logo-sm.webp"
                alt="DLE Entertainment"
                className="h-12 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Do Life Electric — Elite infrastructure for those who choose to light up the world.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-sm uppercase tracking-widest mb-5" style={{ color: 'var(--text)' }}>Quick Links</h4>
            <ul className="space-y-3">
              {[
                { href: '/about', label: 'About Us' },
                { href: '/faq', label: 'FAQ' },
                { href: '/contact', label: 'Contact' },
                { href: '/music', label: 'Music' },
                { href: '/artists', label: 'Artists' },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm transition-colors hover:text-gold" style={{ color: 'var(--text-muted)' }}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display text-sm uppercase tracking-widest mb-5" style={{ color: 'var(--text)' }}>Legal</h4>
            <ul className="space-y-3">
              <li><Link href="/terms" className="text-sm transition-colors hover:text-gold" style={{ color: 'var(--text-muted)' }}>Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-sm transition-colors hover:text-gold" style={{ color: 'var(--text-muted)' }}>Privacy Policy</Link></li>
              <li><Link href="/contact" className="text-sm transition-colors hover:text-gold" style={{ color: 'var(--text-muted)' }}>Support</Link></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-display text-sm uppercase tracking-widest mb-5" style={{ color: 'var(--text)' }}>Connect</h4>
            <ul className="space-y-3">
              <li><a href="mailto:info@dle-entertainment.com" className="text-sm transition-colors hover:text-gold break-all" style={{ color: 'var(--text-muted)' }}>info@dle-entertainment.com</a></li>
              <li><a href="https://dle-entertainment.com" target="_blank" rel="noopener noreferrer" className="text-sm transition-colors hover:text-gold" style={{ color: 'var(--text-muted)' }}>dle-entertainment.com</a></li>
            </ul>
            <div className="mt-6">
              <Link href="/contact" className="btn-gold inline-block text-xs">Contact Us</Link>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-dim)' }}>© {new Date().getFullYear()} DLE Entertainment. All rights reserved.</p>
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Do Life Electric</p>
        </div>
      </div>
    </footer>
  )
}
