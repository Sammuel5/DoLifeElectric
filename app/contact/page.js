'use client'
import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { Mail, Send, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ContactPage() {
  const { data: session, status } = useSession()
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)

  // Auto-fill name/email from signed-in Google profile
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

    // Require sign-in (defense in depth — server also checks)
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
        toast.success('Message sent! We\'ll get back to you soon.')
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
    <div className="py-16 md:py-24 px-4 sm:px-6 max-w-5xl mx-auto">
      <p className="text-gold text-xs uppercase tracking-[0.4em] mb-3">Get In Touch</p>
      <h1 className="font-display font-bold text-white text-4xl md:text-6xl uppercase leading-none mb-4">
        Contact <span className="gold-text">Us</span>
      </h1>
      <p className="text-white/50 text-sm mb-12 flex items-center gap-2">
        <Lock size={14} className="text-gold" />
        Sign in with Google required to send messages (prevents spam)
      </p>

      <div className="grid md:grid-cols-2 gap-12">
        <div>
          <h3 className="font-display text-2xl uppercase text-white mb-6">Direct Email</h3>
          <a href="mailto:info@dle-entertainment.com" className="flex items-center gap-3 text-gold hover:underline text-lg mb-4 break-all">
            <Mail size={20} /> info@dle-entertainment.com
          </a>
          <a href="https://dle-entertainment.com" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-gold text-sm block mb-8">
            dle-entertainment.com
          </a>

          <div className="space-y-6 text-white/60 text-sm leading-relaxed border-t border-white/10 pt-8">
            <p>For business inquiries, artist submissions, or fan support questions — sign in and send us a message using the form, or email us directly.</p>
            <p>For urgent donation/refund issues, please include your PayMongo reference number in your message.</p>
          </div>

          {/* Signed-in indicator */}
          {isSignedIn && (
            <div className="mt-6 p-4 border border-gold/30 bg-gold/5 rounded">
              <p className="text-gold text-xs uppercase tracking-widest mb-1">Signed in as</p>
              <p className="text-white text-sm font-medium">{session.user.name}</p>
              <p className="text-white/60 text-xs">{session.user.email}</p>
            </div>
          )}
        </div>

        {/* Right side: form OR sign-in prompt */}
        {!isSignedIn ? (
          <div className="flex flex-col items-center justify-center border border-white/10 rounded p-8 text-center min-h-[400px]">
            <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mb-6">
              <Lock size={28} className="text-gold" />
            </div>
            <h3 className="font-display text-xl uppercase text-white mb-3">Sign In Required</h3>
            <p className="text-white/60 text-sm mb-8 max-w-sm">
              To help prevent spam and protect our inbox, please sign in with your Google account before sending a message. It only takes a second — we never post anything to your account.
            </p>
            <button
              onClick={() => signIn('google')}
              disabled={status === 'loading'}
              className="btn-gold flex items-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {status === 'loading' ? 'Loading...' : 'Sign in with Google'}
            </button>
            <p className="text-white/30 text-xs mt-6">
              Prefer email? Write us directly at{' '}
              <a href="mailto:info@dle-entertainment.com" className="text-gold hover:underline">info@dle-entertainment.com</a>
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <input
              type="text"
              placeholder="Your Name"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="form-input"
            />
            <input
              type="email"
              placeholder="Your Email"
              required
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="form-input"
            />
            <input
              type="text"
              placeholder="Subject"
              value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}
              className="form-input"
            />
            <textarea
              rows={6}
              placeholder="Your Message..."
              required
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              className="form-input resize-none"
            />
            <button
              type="submit"
              disabled={sending}
              className="btn-gold w-full flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {sending ? 'Sending...' : <><Send size={16} /> Send Message</>}
            </button>
            <p className="text-white/40 text-xs text-center">
              Signed in as {session.user.email}. Your email is included automatically so we can reply.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
