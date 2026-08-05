'use client'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-dark-light border-t border-white/5 mt-16 sm:mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="inline-block mb-4 group">
              <img
                src="/dlelogo/dle-logo-sm.png"
                alt="DLE Entertainment"
                className="h-12 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>
            <p className="text-white/50 text-sm leading-relaxed">
              Do Life Electric — Elite infrastructure for those who choose to light up the world.
            </p>
          </div>

          {/* Quick Links - Functional buttons that navigate */}
          <div>
            <h4 className="font-display text-sm uppercase tracking-widest text-white mb-5">Quick Links</h4>
            <ul className="space-y-3">
              <li><Link href="/about" className="text-white/60 hover:text-gold text-sm transition-colors">About Us</Link></li>
              <li><Link href="/faq" className="text-white/60 hover:text-gold text-sm transition-colors">FAQ</Link></li>
              <li><Link href="/contact" className="text-white/60 hover:text-gold text-sm transition-colors">Contact</Link></li>
              <li><Link href="/music" className="text-white/60 hover:text-gold text-sm transition-colors">Music</Link></li>
              <li><Link href="/artists" className="text-white/60 hover:text-gold text-sm transition-colors">Artists</Link></li>
            </ul>
          </div>

          {/* Legal - Functional buttons */}
          <div>
            <h4 className="font-display text-sm uppercase tracking-widest text-white mb-5">Legal</h4>
            <ul className="space-y-3">
              <li><Link href="/terms" className="text-white/60 hover:text-gold text-sm transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-white/60 hover:text-gold text-sm transition-colors">Privacy Policy</Link></li>
              <li><Link href="/contact" className="text-white/60 hover:text-gold text-sm transition-colors">Support</Link></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-display text-sm uppercase tracking-widest text-white mb-5">Connect</h4>
            <ul className="space-y-3">
              <li><a href="mailto:info@dle-entertainment.com" className="text-white/60 hover:text-gold text-sm transition-colors">info@dle-entertainment.com</a></li>
              <li><a href="https://dle-entertainment.com" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-gold text-sm transition-colors">dle-entertainment.com</a></li>
            </ul>
            <div className="mt-6">
              <Link href="/contact" className="btn-gold inline-block text-xs">Contact Us</Link>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/40 text-xs tracking-widest uppercase">© {new Date().getFullYear()} DLE Entertainment. All rights reserved.</p>
          <p className="text-white/30 text-xs">Do Life Electric</p>
        </div>
      </div>
    </footer>
  )
}
