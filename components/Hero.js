'use client'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'

function SignInBlackPill() {
  const { data: session } = useSession()
  const label = session?.user?.isAdmin
    ? 'ADMIN'
    : session?.user?.name?.split(' ')[0]?.toUpperCase() || 'SIGN IN'
  const Btn = session ? Link : 'button'
  const props = session
    ? { href: session.user?.isAdmin ? '/admin' : '#' }
    : { onClick: () => signIn('google') }
  return (
    <Btn
      {...props}
      className="inline-flex items-center justify-center px-5 sm:px-7 py-2 bg-gold text-black font-semibold uppercase tracking-widest text-xs hover:bg-[#E6C76A] transition-all min-h-[40px]"
    >
      {label}
    </Btn>
  )
}

function Hero() {
  return (
    <section className="relative w-full overflow-hidden bg-dark">
      {/* ============= TRANSPARENT NAV ============= */}
      <nav className="absolute top-0 left-0 right-0 z-30 safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[70px] sm:h-[80px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/dlelogo/dle-logo-sm.png" alt="DLE" className="h-9 sm:h-11 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {[
              ['HOME', '/'],
              ['ABOUT', '/about'],
              ['FAQ', '/faq'],
              ['CONTACT', '/contact'],
              ['ARTIST', '/artists'],
              ['MUSIC', '/music'],
            ].map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="text-white/80 hover:text-gold text-xs uppercase tracking-[0.18em] font-semibold transition-colors"
              >
                {label}
              </Link>
            ))}
            <SignInBlackPill />
          </div>
          <div className="md:hidden"><SignInBlackPill /></div>
        </div>
      </nav>

      {/* ============= DARK HERO with centered gold VISION ============= */}
      <div
        className="relative w-full flex items-center justify-center"
        style={{
          minHeight: '100svh',
          paddingTop: '90px',
          background:
            'radial-gradient(ellipse at center, #1a1408 0%, #0a0804 55%, #000 100%)',
        }}
      >
        {/* Ambient gold glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 48%, rgba(201,168,76,0.18) 0%, transparent 55%)',
          }}
        />
        {/* Subtle noise */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 sm:py-20 text-center">
          <div className="flex justify-center mb-6 sm:mb-8">
            <img
              src="/dlelogo/dle-logo-sm.png"
              alt="DLE Entertainment"
              className="h-24 sm:h-32 md:h-40 w-auto object-contain"
              style={{
                filter: 'drop-shadow(0 8px 24px rgba(201,168,76,0.25))',
              }}
            />
          </div>
          <h1 className="font-display font-black uppercase leading-[0.9] tracking-tight">
            <span className="block text-gold text-6xl sm:text-7xl md:text-8xl lg:text-9xl">
              VISION
            </span>
          </h1>
          <p className="text-white/65 text-sm sm:text-base md:text-lg mt-6 sm:mt-8 max-w-xl mx-auto leading-relaxed">
            Elite infrastructure for artists who choose to
            <br className="hidden sm:block" /> Do Life Electric.
          </p>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <a
              href="#talents"
              className="btn-gold min-w-[240px] sm:min-w-[260px] text-xs sm:text-sm"
            >
              EXPLORE THE ROSTER
            </a>
            <Link
              href="/about"
              className="btn-outline border-gold text-gold hover:bg-gold hover:text-black min-w-[220px] text-xs sm:text-sm"
            >
              OUR STORY
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
