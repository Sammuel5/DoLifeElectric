'use client'
import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import ThemeToggle from './ThemeToggle'
import { useTheme } from './ThemeProvider'

/*
 * Nav layout:
 *
 * DESKTOP (lg+, 1024px+ — real laptops/desktops):
 *   [ HOME · ABOUT · FAQ · CONTACT ]     [LOGO]     [ ARTIST · MUSIC · SUPPORT · SIGN IN/ADMIN ]
 *   Black capsule smoothly slides to the active text link.
 *   The SIGN IN/ADMIN button is a rounded-[10px] black rectangle (far right).
 *
 * MOBILE / TABLET (< lg, i.e. ≤1023px — includes phones in portrait AND landscape, iPads):
 *   [LOGO]                              [ MENU  ☰ ]   (black capsule, pill-shaped)
 *   Tapping MENU opens a full-screen gold/dark drawer with all links stacked.
 */

const LEFT_LINKS  = [
  { label: 'HOME',    href: '/'        },
  { label: 'ABOUT',   href: '/about'   },
  { label: 'FAQ',     href: '/faq'     },
  { label: 'CONTACT', href: '/contact' },
]
const RIGHT_LINKS = [
  { label: 'ARTIST',  href: '/artists' },
  { label: 'MUSIC',   href: '/music'   },
  { label: 'SUPPORT', href: '/artists#support' },
]

// Desktop kicks in at 1024px (lg) so phones + tablets (even landscape) stay on mobile nav.
const DESKTOP_BREAKPOINT = 1024

function isActive(pathname, href) {
  if (href === '/') return pathname === '/'
  const cleanHref = href.split('#')[0]
  return pathname === cleanHref || pathname.startsWith(cleanHref + '/')
}

// Hamburger icon (three bars)
function HamburgerIcon() {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="0" y="0"   width="22" height="3" rx="1.5" fill="white" />
      <rect x="0" y="6.5" width="22" height="3" rx="1.5" fill="white" />
      <rect x="0" y="13"  width="22" height="3" rx="1.5" fill="white" />
    </svg>
  )
}

// Close (X) icon
function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <line x1="4" y1="4" x2="16" y2="16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="16" y1="4" x2="4" y2="16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export default function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const isAdmin = !!session?.user?.isAdmin
  const { theme, mounted } = useTheme()
  const isDark = !mounted ? true : theme === 'dark'

  // ----- Theme toggle is now inside the account dropdown (desktop) and
  // inside the mobile drawer account block (mobile). No standalone icon
  // in the navbar (which clashed visually with the admin header and
  // unbalanced the 4/4 symmetry).

  // Sliding pill (desktop only)
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, height: 0, top: 0, opacity: 0 })
  const [pillSide, setPillSide]   = useState(null)
  const leftListRef  = useRef(null)
  const rightListRef = useRef(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuWrapRef = useRef(null)

  // Mobile drawer
  const [mobileOpen, setMobileOpen] = useState(false)
  const drawerRef = useRef(null)

  useEffect(() => {
    function movePill() {
      // Only compute pill on DESKTOP (lg+ = 1024px)
      if (window.innerWidth < DESKTOP_BREAKPOINT) {
        setPillStyle(s => ({ ...s, opacity: 0 }))
        setPillSide(null)
        return
      }
      const inLeft  = LEFT_LINKS.find(l => isActive(pathname, l.href))
      const inRight = RIGHT_LINKS.find(l => isActive(pathname, l.href))
      const active = inLeft || inRight
      if (!active) { setPillStyle(s => ({ ...s, opacity: 0 })); setPillSide(null); return }

      const side = inLeft ? 'left' : 'right'
      const container = side === 'left' ? leftListRef.current : rightListRef.current
      if (!container) return
      const el = container.querySelector(`[data-href="${active.href}"]`)
      if (!el) return
      const parentRect = container.getBoundingClientRect()
      const rect = el.getBoundingClientRect()
      setPillSide(side)
      setPillStyle({
        left: rect.left - parentRect.left,
        width: rect.width,
        height: rect.height,
        top: rect.top - parentRect.top,
        opacity: 1,
      })
    }
    movePill()
    window.addEventListener('resize', movePill)
    return () => window.removeEventListener('resize', movePill)
  }, [pathname])

  // Close user menu on outside click / Escape
  useEffect(() => {
    if (!userMenuOpen) return
    function onClick(e) {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target)) setUserMenuOpen(false)
    }
    function onKey(e) { if (e.key === 'Escape') setUserMenuOpen(false) }
    const raf = requestAnimationFrame(() => {
      window.addEventListener('click', onClick)
      window.addEventListener('keydown', onKey)
    })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('click', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [userMenuOpen])

  // Lock scroll when mobile drawer is open; close on Escape
  useEffect(() => {
    if (!mobileOpen) return
    document.body.style.overflow = 'hidden'
    function onKey(e) { if (e.key === 'Escape') setMobileOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [mobileOpen])

  // Close drawer when route changes
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Close drawer when resizing up to desktop
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= DESKTOP_BREAKPOINT) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const signedInLabel = isAdmin ? 'ADMIN' : (session?.user?.name?.split(' ')[0]?.toUpperCase() || 'ACCOUNT')

  const darkHeader = {
    background: 'linear-gradient(180deg, #5c4a20 0%, #4a3a18 50%, #3d2f13 100%)',
    borderBottom: '2px solid #2c2209',
    boxShadow: 'inset 0 1px 0 rgba(255,220,140,0.18), inset 0 -1px 0 rgba(0,0,0,0.55), 0 4px 18px rgba(0,0,0,0.35)',
  }
  const lightHeader = {
    background: 'linear-gradient(180deg, #fffaf0 0%, #f3ead3 55%, #e6d8b3 100%)',
    borderBottom: '2px solid #d4c48d',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(138,117,48,0.25), 0 4px 18px rgba(138,117,48,0.10)',
  }

  return (
    <header
      className="relative w-full h-[56px] sm:h-[64px] lg:h-[88px] z-50"
      style={{
        ...(isDark ? darkHeader : lightHeader),
        paddingTop: 'env(safe-area-inset-top, 0px)',
        transition: 'background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease',
      }}>
      {/* Height via class above — global --nav-h CSS var is set in globals.css for other sections to reference */}

      {/* Subtle texture */}
      <div aria-hidden
        className={`absolute inset-0 pointer-events-none ${isDark ? 'mix-blend-soft-light opacity-80' : 'mix-blend-multiply opacity-25'}`}
        style={{ backgroundImage: "url('/header-texture.png')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div aria-hidden className="pointer-events-none absolute inset-0"
        style={{
          boxShadow: isDark
            ? 'inset 0 0 120px rgba(0,0,0,0.3)'
            : 'inset 0 0 80px rgba(138,117,48,0.08)',
        }} />

      <nav className="relative h-full max-w-[1700px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 flex items-center justify-between">

        {/* =============== MOBILE / TABLET LAYOUT (< lg, i.e. ≤1023px, including landscape phones & iPads) =============== */}
        {/* Left: shield logo */}
        <Link href="/" aria-label="DLE Home"
          className="lg:hidden flex items-center pointer-events-auto transition-transform hover:scale-[1.05] active:scale-[0.97]">
          <img src="/dlelogo/dle-logo-sm.png" alt="DLE Entertainment"
            className="h-[34px] sm:h-[40px] w-auto object-contain block"
            style={{
              filter: isDark
                ? 'drop-shadow(0 4px 10px rgba(0,0,0,0.55))'
                : 'drop-shadow(0 2px 6px rgba(138,117,48,0.30))',
              transform: 'translateY(-2px)',
            }} />
        </Link>

        {/* Right: MENU button */}
        <button
          onClick={(e) => { e.stopPropagation(); setMobileOpen(v => !v) }}
          className="lg:hidden inline-flex items-center gap-2 px-5 sm:px-[22px] font-display font-bold uppercase tracking-[0.12em] active:scale-95 transition-all"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          type="button"
          style={{
            height: '38px',
            borderRadius: 999,
            background: isDark
              ? 'linear-gradient(90deg,#0e0e0e_0%,#1f1f1f_100%)'
              : 'linear-gradient(90deg,#1A1713_0%,#2e2a22_100%)',
            color: '#fff',
            boxShadow: isDark
              ? '0 4px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)'
              : '0 4px 14px rgba(60,50,20,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
            transform: 'translateY(-2px)',
          }}
        >
          <span className="leading-none" style={{ fontSize: '14px' }}>MENU</span>
          {mobileOpen ? <CloseIcon /> : <HamburgerIcon />}
        </button>

        {/* =============== DESKTOP LAYOUT (lg+, 1024px+) =============== */}
        {/* LEFT LINKS */}
        <ul ref={leftListRef} className="hidden lg:flex relative items-center gap-5 xl:gap-8 flex-1 justify-start min-w-0">
          {pillSide === 'left' && (
            <span
              aria-hidden
              className={`absolute rounded-full pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isDark ? 'bg-black' : 'bg-[#1A1713]/90'}`}
              style={{
                left: pillStyle.left,
                width: pillStyle.width,
                height: pillStyle.height,
                top: pillStyle.top,
                transform: 'translateZ(0)',
              }}
            />
          )}
          {LEFT_LINKS.map(({ label, href }) => {
            const active = isActive(pathname, href)
            const linkCls = isDark
              ? (active ? 'text-white' : 'text-white hover:text-[#f5dfa0]')
              : (active ? 'text-[#1A1713]' : 'text-[#3A3326] hover:text-[#8A7530]')
            return (
              <li key={label} data-href={href} className="flex-shrink-0 relative z-10">
                <Link href={href}
                  className={`inline-flex items-center justify-center px-5 lg:px-6 xl:px-8 py-2 text-lg lg:text-xl font-display font-semibold uppercase tracking-[0.1em] whitespace-nowrap transition-colors ${linkCls}`}>
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* CENTER LOGO (desktop only) */}
        <Link href="/" aria-label="DLE Home"
          className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-auto transition-transform hover:scale-[1.05] active:scale-[0.97]">
          <img src="/dlelogo/dle-logo-sm.png" alt="DLE Entertainment"
            className="h-[60px] xl:h-[68px] w-auto object-contain"
            style={{ filter: isDark ? 'drop-shadow(0 4px 10px rgba(0,0,0,0.55))' : 'drop-shadow(0 2px 6px rgba(138,117,48,0.25))' }} />
        </Link>

        {/* RIGHT LINKS + SIGN IN (desktop) */}
        <div className="hidden lg:flex items-center gap-5 xl:gap-8 flex-1 justify-end min-w-0">
          <ul ref={rightListRef} className="relative flex items-center gap-5 xl:gap-8">
            {pillSide === 'right' && (
              <span
                aria-hidden
                className={`absolute rounded-full pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isDark ? 'bg-black' : 'bg-[#1A1713]/90'}`}
                style={{
                  left: pillStyle.left,
                  width: pillStyle.width,
                  height: pillStyle.height,
                  top: pillStyle.top,
                  transform: 'translateZ(0)',
                }}
              />
            )}
            {RIGHT_LINKS.map(({ label, href }) => {
              const active = isActive(pathname, href)
              const linkCls = isDark
                ? (active ? 'text-white' : 'text-white hover:text-[#f5dfa0]')
                : (active ? 'text-[#1A1713]' : 'text-[#3A3326] hover:text-[#8A7530]')
              return (
                <li key={label} data-href={href} className="flex-shrink-0 relative z-10">
                  <Link href={href}
                    className={`inline-flex items-center justify-center px-5 lg:px-6 xl:px-8 py-2 text-lg lg:text-xl font-display font-semibold uppercase tracking-[0.1em] whitespace-nowrap transition-colors ${linkCls}`}>
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* SIGN IN / USER MENU BUTTON (desktop). Theme toggle lives
              inside the dropdown below (only visible when signed in). */}
          <div className="relative" ref={menuWrapRef}>
            {session ? (
              <>
                <button onClick={() => setUserMenuOpen(v => !v)}
                  className="inline-flex items-center justify-center px-5 lg:px-6 xl:px-8 py-2 text-lg lg:text-xl font-display font-semibold uppercase tracking-[0.1em] whitespace-nowrap transition-all hover:opacity-90"
                  style={{
                    borderRadius: 10,
                    background: isDark
                      ? 'linear-gradient(90deg,#141414_0%,#2b2b2b_100%)'
                      : 'linear-gradient(90deg,#1A1713_0%,#2e2a22_100%)',
                    color: '#fff',
                    boxShadow: isDark
                      ? '0 2px 8px rgba(0,0,0,0.4)'
                      : '0 2px 10px rgba(60,50,20,0.18)',
                  }}
                  aria-haspopup="menu" aria-expanded={userMenuOpen}>
                  {signedInLabel}
                </button>
                {userMenuOpen && (
                  <div role="menu"
                    className="absolute right-0 top-[calc(100%+8px)] w-64 py-1 z-50 overflow-hidden"
                    style={{
                      borderRadius: 14,
                      background: isDark
                        ? 'linear-gradient(180deg,#161616 0%,#0d0d0d 100%)'
                        : 'linear-gradient(180deg,#FFFFFF 0%,#FBF8F2 100%)',
                      border: isDark ? '1.5px solid #C9A84C' : '1.5px solid #B8943F',
                      boxShadow: isDark
                        ? '0 14px 40px rgba(0,0,0,0.75), 0 0 0 1px rgba(201,168,76,0.15)'
                        : '0 14px 40px rgba(60,50,20,0.22)',
                    }}>
                    {isAdmin && (
                      <Link role="menuitem" href="/admin" onClick={() => setUserMenuOpen(false)}
                        className={`flex items-center gap-3 px-5 py-3.5 font-display uppercase tracking-[0.15em] text-base transition-colors ${
                          isDark ? 'text-white hover:bg-gold/10 hover:text-gold' : 'text-[#1A1713] hover:bg-[#f5ecd4] hover:text-[#8A7530]'
                        }`}>
                        Admin Dashboard
                      </Link>
                    )}
                    {/* Theme toggle row inside dropdown */}
                    <div role="menuitem" className={
                      (isAdmin ? 'border-t ' : '') +
                      (isDark ? 'border-gold/15' : 'border-[#E5DFD1]')
                    }>
                      <ThemeToggle variant="menu" />
                    </div>
                    <button role="menuitem" onClick={() => { setUserMenuOpen(false); signOut() }}
                      className={`w-full text-left flex items-center gap-3 px-5 py-3.5 font-display uppercase tracking-[0.15em] text-base border-t transition-colors ${
                        isDark
                          ? 'text-white/80 hover:text-red-300 border-gold/15 hover:bg-red-500/10'
                          : 'text-[#3A3326] hover:text-red-600 border-[#E5DFD1] hover:bg-red-500/5'
                      }`}>
                      Sign Out
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button onClick={() => signIn('google')}
                className="inline-flex items-center justify-center px-5 lg:px-6 xl:px-8 py-2 text-lg lg:text-xl font-display font-semibold uppercase tracking-[0.1em] whitespace-nowrap transition-all hover:opacity-90"
                style={{
                  borderRadius: 10,
                  background: isDark
                    ? 'linear-gradient(90deg,#141414_0%,#2b2b2b_100%)'
                    : 'linear-gradient(90deg,#1A1713_0%,#2e2a22_100%)',
                  color: '#fff',
                  boxShadow: isDark
                    ? '0 2px 8px rgba(0,0,0,0.4)'
                    : '0 2px 10px rgba(60,50,20,0.18)',
                }}>
                SIGN IN
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* =============== MOBILE DRAWER =============== */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!mobileOpen}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 ${isDark ? 'bg-black/70' : 'bg-[#1A1713]/40 backdrop-blur-sm'}`}
          onClick={() => setMobileOpen(false)}
        />

        {/* Drawer panel */}
        <div
          ref={drawerRef}
          className={`absolute top-0 right-0 h-full w-[84%] max-w-[360px] transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}
          style={{
            background: isDark
              ? 'linear-gradient(180deg, #1a1408 0%, #0f0c05 100%)'
              : 'linear-gradient(180deg, #FFFFFF 0%, #F7F3EB 100%)',
            borderLeft: `2px solid ${isDark ? '#C9A84C' : '#B8943F'}`,
            boxShadow: isDark
              ? '-10px 0 40px rgba(0,0,0,0.6)'
              : '-10px 0 40px rgba(60,50,20,0.18)',
          }}
        >
          {/* Ambient glow */}
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
            style={{
              background: isDark
                ? 'radial-gradient(ellipse at 0% 0%, rgba(201,168,76,0.18) 0%, rgba(0,0,0,0) 50%)'
                : 'radial-gradient(ellipse at 0% 0%, rgba(184,148,63,0.15) 0%, rgba(0,0,0,0) 50%)',
            }} />
          <div aria-hidden="true"
            className={`absolute inset-0 bg-cover bg-center pointer-events-none ${isDark ? 'opacity-30' : 'opacity-10 mix-blend-multiply'}`}
            style={{ backgroundImage: "url('/dark-texture.png')" }} />

          {/* Small DLE logo top */}
          <div className={`relative pt-8 pb-6 px-6 flex flex-col items-center border-b ${isDark ? 'border-gold/20' : 'border-[#E5DFD1]'}`}>
            <img src="/dlelogo/dle-logo-sm.png" alt="" className="h-[58px] w-auto object-contain"
              style={{
                filter: isDark
                  ? 'drop-shadow(0 4px 10px rgba(0,0,0,0.55))'
                  : 'drop-shadow(0 2px 8px rgba(138,117,48,0.25))',
              }} />
            <p className={`mt-2 font-display text-xs tracking-[0.4em] uppercase ${isDark ? 'text-gold' : 'text-[#8A7530]'}`}>DLE Entertainment</p>
          </div>

          {/* Scrollable nav area — fills space, theme toggle and auth pinned at bottom via flex */}
          <nav className="relative px-4 py-5 overflow-y-auto flex-1 min-h-0">
            <ul className="flex flex-col">
              {[...LEFT_LINKS, ...RIGHT_LINKS].map(({ label, href }) => {
                const active = isActive(pathname, href)
                const activeCls = isDark ? 'text-gold' : 'text-[#8A7530]'
                const idleCls = isDark ? 'text-white hover:text-gold' : 'text-[#1A1713] hover:text-[#8A7530]'
                const borderCls = isDark ? 'border-white/10' : 'border-[#E5DFD1]'
                const dotCls = isDark ? 'text-gold' : 'text-[#B8943F]'
                return (
                  <li key={href}>
                    <Link href={href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between px-4 py-4 border-b ${borderCls} font-display uppercase tracking-[0.15em] text-lg transition-colors ${active ? activeCls : idleCls}`}>
                      <span>{label}</span>
                      {active && <span className={dotCls}>●</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Theme toggle moved into the sign-in / account block below so
              it sits alongside the other account actions. */}

          {/* Sign in / account block */}
          <div className="relative px-4 py-4">
            {session ? (
              <>
                <div className={`px-2 py-3 mb-2 flex items-center gap-3 border-b ${isDark ? 'border-white/10' : 'border-[#E5DFD1]'}`}>
                  {session.user?.image && (
                    <img src={session.user.image} alt="" className={`w-10 h-10 rounded-full border-2 ${isDark ? 'border-gold' : 'border-[#B8943F]'}`} />
                  )}
                  <div className="min-w-0">
                    <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-[#1A1713]'}`}>{session.user?.name}</p>
                    <p className={`text-xs truncate ${isDark ? 'text-white/50' : 'text-[#6B6558]'}`}>{session.user?.email}</p>
                  </div>
                </div>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setMobileOpen(false)}
                    className={`block w-full text-left px-2 py-3 font-display uppercase tracking-[0.12em] transition-colors ${
                      isDark ? 'text-white hover:text-gold' : 'text-[#1A1713] hover:text-[#8A7530]'
                    }`}>
                    Admin Dashboard
                  </Link>
                )}
                {/* Mobile theme toggle — lives in the account block, matching
                    the desktop dropdown layout. Border separates it from the
                    items above and below. */}
                <div className={isDark ? 'border-y border-gold/15 -mx-0' : 'border-y border-[#E5DFD1]'}>
                  <ThemeToggle variant="drawer" />
                </div>
                <button onClick={() => { setMobileOpen(false); signOut() }}
                  className={`w-full text-left px-2 py-3 font-display uppercase tracking-[0.12em] transition-colors ${
                    isDark ? 'text-white/80 hover:text-gold' : 'text-[#6B6558] hover:text-[#8A7530]'
                  }`}>
                  Sign Out
                </button>
              </>
            ) : (
              <>
                {/* Guests can also toggle theme */}
                <div className={(isDark ? 'border-t border-gold/15 pt-2' : 'border-t border-[#E5DFD1] pt-2')}>
                  <ThemeToggle variant="drawer" />
                </div>
                <button onClick={() => { setMobileOpen(false); signIn('google') }}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 font-display uppercase tracking-[0.12em] text-white transition-all active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(180deg, #8A7530 0%, #5C4B1F 100%)',
                    borderRadius: 10,
                    boxShadow: isDark
                      ? '0 4px 14px rgba(0,0,0,0.4)'
                      : '0 4px 14px rgba(138,117,48,0.25)',
                  }}>
                  {/* Google G */}
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
