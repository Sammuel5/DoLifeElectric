'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, Music2, Users, Info, HelpCircle, Mail, Home } from 'lucide-react'
import { useSession, signIn, signOut } from 'next-auth/react'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { data: session } = useSession()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/artists', label: 'Artists', icon: Users },
    { href: '/music', label: 'Music', icon: Music2 },
    { href: '/about', label: 'About', icon: Info },
    { href: '/faq', label: 'FAQ', icon: HelpCircle },
    { href: '/contact', label: 'Contact', icon: Mail },
  ]

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled ? 'bg-dark/95 backdrop-blur-md border-b border-white/5' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <img
              src="/dlelogo/dle-logo-sm.png"
              alt="DLE Entertainment"
              className="h-9 sm:h-11 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {links.map(l => (
              <Link key={l.href} href={l.href} className="text-white/70 hover:text-gold text-xs uppercase tracking-widest font-medium transition-colors">
                {l.label}
              </Link>
            ))}
            {session?.user?.isAdmin && (
              <Link href="/admin" className="text-gold text-xs uppercase tracking-widest font-semibold hover:underline">Admin</Link>
            )}
            {session ? (
              <button onClick={() => signOut()} className="btn-dark text-xs">Sign Out</button>
            ) : (
              <button onClick={() => signIn('google')} className="btn-gold text-xs">Sign In</button>
            )}
          </div>

          <button className="md:hidden text-white p-2" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="fixed inset-0 z-50 bg-dark md:hidden pt-20 animate-fade-in safe-pt safe-bottom overflow-y-auto">
          <div className="flex flex-col p-5 sm:p-6 gap-2 min-h-full">
            {links.map(l => {
              const Icon = l.icon
              return (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                  className="flex items-center gap-4 p-4 border-b border-white/10 text-white hover:text-gold transition-colors">
                  <Icon size={20} className="text-gold" />
                  <span className="font-display text-xl uppercase tracking-wider">{l.label}</span>
                </Link>
              )
            })}
            {session?.user?.isAdmin && (
              <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-4 p-4 border-b border-white/10 text-gold">
                <span className="font-display text-xl uppercase tracking-wider">Admin Dashboard</span>
              </Link>
            )}
            <div className="pt-6">
              {session ? (
                <button onClick={() => { signOut(); setOpen(false) }} className="btn-dark w-full">Sign Out ({session.user.name})</button>
              ) : (
                <button onClick={() => { signIn('google'); setOpen(false) }} className="btn-gold w-full">Sign in with Google</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
