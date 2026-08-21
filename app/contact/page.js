'use client'
import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { Send } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ContactPage() {
  const { data: session, status } = useSession()
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (session?.user) {
      setForm(f => ({
        ...f,
        name: f.name || session.user.name || '',
        email: f.email || session.user.email || '',
      }))
    }
  }, [session])

  const submit = async e => {
    e.preventDefault()
    if (!session?.user) {
      toast.error('Please sign in with Google to send a message')
      signIn('google')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Message sent! We'll get back to you soon.")
        setForm({ name: session.user.name || '', email: session.user.email || '', subject: '', message: '' })
      } else {
        toast.error(data.error || 'Failed to send')
      }
    } catch (err) {
      toast.error('Failed to send: ' + err.message)
    }
    setSending(false)
  }

  const isSignedIn = status === 'authenticated' && session?.user

  return (
    <div
      className="relative w-full overflow-hidden cinematic-dark"
      style={{
        minHeight: 'calc(100dvh - var(--nav-h))',
        background:
          'radial-gradient(ellipse at 50% 40%, #1a1608 0%, #0A0806 55%, #000 100%)',
      }}
    >
      {/* Gold side glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 0% 100%, rgba(201,168,76,0.22) 0%, rgba(0,0,0,0) 45%), radial-gradient(ellipse at 100% 100%, rgba(201,168,76,0.22) 0%, rgba(0,0,0,0) 45%), radial-gradient(ellipse at 100% 0%, rgba(201,168,76,0.10) 0%, rgba(0,0,0,0) 40%)',
        }}
      />

      {/* Giant faded DLE shield watermark in center */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.07] z-0">
        <img
          src="/dlelogo/dle-logo-sm.png"
          alt=""
          className="w-[520px] md:w-[720px] lg:w-[900px] max-w-none select-none"
        />
      </div>

      {/* LEFT dancer: faded ghost duplicate behind (mobile: smaller/less opacity) */}
      <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-[52%] z-[1] opacity-[0.08] md:opacity-[0.18] block">
        <img
          src="/uploads/images/home/contact-dancer-left.png"
          alt=""
          className="h-[38vh] sm:h-[50vh] md:h-[70vh] lg:h-[80vh] w-auto object-contain -translate-x-[20%] sm:-translate-x-[15%] md:-translate-x-[10%] scale-x-[-1]"
        />
      </div>
      {/* LEFT dancer: foreground (smaller; on mobile tucked closer to edge) */}
      <div className="pointer-events-none absolute left-0 bottom-0 z-[3] block">
        <img
          src="/uploads/images/home/contact-dancer-left.png"
          alt=""
          className="h-[30vh] sm:h-[45vh] md:h-[62vh] lg:h-[72vh] w-auto object-contain"
          style={{
            marginLeft: '-12%',
            marginBottom: '-5%',
            opacity: 0.55,
            filter: 'drop-shadow(8px 0 24px rgba(0,0,0,0.6))',
          }}
        />
      </div>

      {/* RIGHT dancer: faded ghost duplicate behind */}
      <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-[52%] z-[1] opacity-[0.08] md:opacity-[0.18] block">
        <img
          src="/uploads/images/home/contact-dancer-right.png"
          alt=""
          className="h-[38vh] sm:h-[50vh] md:h-[70vh] lg:h-[80vh] w-auto object-contain translate-x-[20%] sm:translate-x-[15%] md:translate-x-[10%]"
        />
      </div>
      {/* RIGHT dancer: foreground (smaller; on mobile tucked closer to edge) */}
      <div className="pointer-events-none absolute right-0 bottom-0 z-[3] block">
        <img
          src="/uploads/images/home/contact-dancer-right.png"
          alt=""
          className="h-[30vh] sm:h-[45vh] md:h-[62vh] lg:h-[72vh] w-auto object-contain"
          style={{
            marginRight: '-12%',
            marginBottom: '-5%',
            opacity: 0.55,
            filter: 'drop-shadow(-8px 0 24px rgba(0,0,0,0.6))',
          }}
        />
      </div>

      {/* ========== CONTENT (centered, readable over dancers) ========== */}
      <div className="relative z-10 flex flex-col items-center justify-start w-full max-w-2xl mx-auto pt-10 md:pt-16 lg:pt-12 pb-20 px-4 md:px-8">

        {/* Top gold banner */}
        <div
          className="w-full max-w-2xl text-center px-6 md:px-10 py-4 md:py-5 mb-8 md:mb-10"
          style={{
            background: 'linear-gradient(180deg, #8A7530 0%, #5C4B1F 100%)',
            borderRadius: '999px',
            border: '2px solid rgba(201,168,76,0.5)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)',
          }}
        >
          <p className="text-white/90 text-xs md:text-sm uppercase tracking-[0.35em] mb-1">Get in Touch</p>
          <h1
            className="font-display font-bold uppercase text-white leading-none"
            style={{ fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '0.02em' }}
          >
            Contact Us
          </h1>
          <p className="text-white/75 text-[11px] md:text-xs mt-1.5">
            Sign in with Google required to send messages (prevents spam)
          </p>
        </div>

        {/* Direct Email pill */}
        <div className="inline-flex items-center gap-2 bg-white text-dark font-bold uppercase tracking-widest text-xs md:text-sm px-6 py-1.5 rounded-full mb-4">
          Direct Email
        </div>

        {/* Email links */}
        <a
          href="mailto:info@dle-entertainment.com"
          className="block text-gold hover:brightness-125 transition-all text-xl md:text-3xl font-light tracking-wide mb-1"
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}
        >
          info@dle-entertainment.com
        </a>
        <a
          href="https://dle-entertainment.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-white hover:text-gold transition-colors text-lg md:text-2xl font-light tracking-wide mb-5 md:mb-6"
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}
        >
          dle-entertainment.com
        </a>

        {/* Gold divider */}
        <div className="w-64 md:w-80 h-px bg-gold/50 mb-5 md:mb-6" />

        {/* Help text — centered, max width so it doesn't crash into dancers */}
        <div className="text-white/85 text-sm md:text-base leading-snug max-w-md text-center space-y-2 mb-8 md:mb-10 px-4"
             style={{ textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}>
          <p>For business inquiries, artist submissions, or fan support questions — sign in and send us a message using the form, or email us directly.</p>
          <p>For urgent donation/refund issues, please include your PayMongo reference number in your message.</p>
        </div>

        {/* Sign-in / Form card */}
        {!isSignedIn ? (
          <div
            className="w-full max-w-md text-center p-7 md:p-9 flex flex-col items-center"
            style={{
              background: 'linear-gradient(180deg, #060606 0%, #000 100%)',
              borderRadius: '24px',
              border: '1.5px solid rgba(201,168,76,0.4)',
              boxShadow: '0 0 40px rgba(201,168,76,0.25), 0 18px 50px rgba(0,0,0,0.75)',
            }}
          >
            {/* Lock icon */}
            <img
              src="/uploads/images/home/lock-icon.png"
              alt=""
              aria-hidden="true"
              className="w-14 h-14 md:w-16 md:h-16 mb-3 md:mb-4 opacity-95"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <h3 className="font-display font-bold uppercase text-white text-xl md:text-2xl mb-3 leading-tight">
              Sign in Required
            </h3>
            <p className="text-white/80 text-sm md:text-base leading-relaxed mb-5 md:mb-6">
              To help prevent spam and protect our inbox, please sign in with your Google account before sending a message. It only takes a second — we never post anything to your account.
            </p>
            <button
              onClick={() => signIn('google')}
              disabled={status === 'loading'}
              className="w-full flex items-center justify-center gap-3 font-semibold px-6 py-3 md:py-3.5 rounded-md text-base md:text-lg transition-all hover:brightness-110 hover:shadow-[0_0_22px_rgba(201,168,76,0.5)]"
              style={{ background: 'linear-gradient(180deg, #8A7530 0%, #5C4B1F 100%)', color: '#fff' }}
            >
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-white" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </span>
              {status === 'loading' ? 'Loading...' : 'Sign in with Google'}
            </button>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="w-full max-w-md space-y-4 p-7 md:p-9"
            style={{
              background: 'linear-gradient(180deg, #060606 0%, #000 100%)',
              borderRadius: '24px',
              border: '1.5px solid rgba(201,168,76,0.4)',
              boxShadow: '0 0 40px rgba(201,168,76,0.25), 0 18px 50px rgba(0,0,0,0.75)',
            }}
          >
            <h3 className="font-display font-bold uppercase text-white text-xl md:text-2xl mb-1 text-center leading-tight">
              Send a Message
            </h3>
            <p className="text-white/60 text-xs md:text-sm text-center mb-4">
              Signed in as <span className="text-gold">{session.user.email}</span>
            </p>
            <input
              type="text"
              placeholder="Your Name"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="form-input !bg-black/50 !border-white/15"
            />
            <input
              type="email"
              placeholder="Your Email"
              required
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="form-input !bg-black/50 !border-white/15"
            />
            <input
              type="text"
              placeholder="Subject"
              value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}
              className="form-input !bg-black/50 !border-white/15"
            />
            <textarea
              rows={5}
              placeholder="Your Message..."
              required
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              className="form-input resize-none !bg-black/50 !border-white/15"
            />
            <button
              type="submit"
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 font-semibold px-6 py-3 rounded-md text-base transition-all hover:brightness-110 hover:shadow-[0_0_22px_rgba(201,168,76,0.5)] disabled:opacity-60"
              style={{ background: 'linear-gradient(180deg, #8A7530 0%, #5C4B1F 100%)', color: '#fff' }}
            >
              {sending ? 'Sending...' : <><Send size={16} /> Send Message</>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
