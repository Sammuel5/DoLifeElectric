'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Terminal, MessageSquare, Send, Home, ArrowLeft, Wifi, Lock, Search, Compass,
} from 'lucide-react'

/* =========================================================================
   404 — CINEMATIC "LOST SIGNAL" DEV CHAT
   Reuses the same secure-terminal vibe as the admin access screen.
   ========================================================================= */

const SCRIPT = [
  "Uh… that's weird.",
  "I can't find the page you're looking for.",
  "I checked the usual places — main site, artists, music, the vault. Nothing.",
  "Either the link is broken, Sam moved something, or you wandered somewhere you shouldn't have.",
]

const QUICK_REPLIES = [
  { text: "Where am I?", reply: "You're in the void between routes. It's quiet back here. A little too quiet." },
  { text: "Take me home.", reply: "Smart move. Home button's below — it'll drop you back on the main site." },
  { text: "Can you search for it?", reply: "I would, but I'm a terminal UI, not Google. Try the Music or Artists pages from home." },
  { text: "I'm lost.", reply: "Happens to the best of us. Just hit that home button and you'll be fine. Gold's on me." },
]

const CANNED_REPLIES = [
  "Haha. Very funny. You're still on the 404 page.",
  "Logging this. Sam's gonna hear about it.",
  "You can keep typing, but I'm still just gonna tell you to go home.",
  "Beep boop. Page not found. Human not found either, apparently.",
  "Alright, alright. Home button is the glowing gold one 👇",
]

export default function NotFound() {
  const router = useRouter()
  const [messages, setMessages] = useState([])
  const [typing, setTyping] = useState(false)
  const [stage, setStage] = useState(0) // 0: booting, 1: intro, 2: quick replies, 3: free chat
  const [availableReplies, setAvailableReplies] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [booted, setBooted] = useState(false)
  const [path, setPath] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') setPath(window.location.pathname)
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = document.getElementById('notfound-chat-scroll')
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, typing])

  // Boot sequence
  useEffect(() => {
    let cancelled = false
    const bootLines = [
      { delay: 150, text: '> routing request…', cls: 'text-white/40' },
      { delay: 450, text: '> err: NO_ROUTE_MATCH (404)', cls: 'text-red-400/80' },
      { delay: 850, text: '> opening emergency channel to dev…', cls: 'text-white/40' },
      { delay: 1350, text: '> secure line established', cls: 'gold-text font-bold' },
    ]
    bootLines.forEach((b, i) => {
      setTimeout(() => {
        if (cancelled) return
        setMessages(m => [...m, { who: 'system', text: b.text, className: b.cls }])
        if (i === bootLines.length - 1) {
          setTimeout(() => {
            if (cancelled) return
            setBooted(true)
            runScript()
          }, 300)
        }
      }, b.delay)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addDev = (text, opts = {}) => new Promise(resolve => {
    setTyping(true)
    const t = Math.min(1800, 400 + text.length * 22)
    setTimeout(() => {
      setTyping(false)
      setMessages(m => [...m, { who: 'dev', text, ...opts }])
      resolve()
    }, t)
  })

  const runScript = async () => {
    if (path) {
      await addDev(`Requested path: ${path}`, { mono: true, dim: true })
      await new Promise(r => setTimeout(r, 350))
    }
    for (const line of SCRIPT) {
      await addDev(line)
      await new Promise(r => setTimeout(r, 300))
    }
    setAvailableReplies(QUICK_REPLIES)
    setStage(2)
  }

  const handleQuickReply = async (r) => {
    setMessages(m => [...m, { who: 'user', text: r.text }])
    setAvailableReplies([])
    await new Promise(r => setTimeout(r, 250))
    await addDev(r.reply)
    await new Promise(r => setTimeout(r, 400))
    setStage(3)
  }

  const handleSend = async (e) => {
    e.preventDefault()
    const text = inputValue.trim()
    if (!text) return
    setMessages(m => [...m, { who: 'user', text }])
    setInputValue('')
    setAvailableReplies([])
    await new Promise(r => setTimeout(r, 250))
    const reply = CANNED_REPLIES[Math.floor(Math.random() * CANNED_REPLIES.length)]
    await addDev(reply)
    setStage(3)
  }

  const goHome = () => router.push('/')
  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto" style={{ background: '#050505' }}>
      <div className="w-full max-w-2xl my-auto">
        {/* Window chrome */}
        <div className="flex items-center justify-between px-4 py-2 rounded-t-sm font-mono text-[10px] sm:text-xs uppercase tracking-widest"
          style={{ background: '#0c0c0c', borderBottom: '1px solid #1a1a1a', color: '#6B6558' }}>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500/70" />
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-500/70" />
            <span className="inline-block w-2 h-2 rounded-full bg-green-500/70" />
            <span className="ml-2 hidden sm:inline">dle-404-rescue.sh</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Compass size={10} /> LOST SIGNAL</span>
            <Lock size={10} />
          </div>
        </div>

        {/* Chat */}
        <div id="notfound-chat-scroll"
          className="px-3 sm:px-5 py-4 sm:py-6 overflow-y-auto"
          style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)', maxHeight: '72vh' }}>
          <div className="space-y-3">
            {/* Giant 404 watermark behind everything? No — keep it minimal but add a corner label */}
            <div className="flex justify-center mb-1">
              <div className="font-display text-7xl sm:text-8xl font-black tracking-widest gold-text select-none opacity-90"
                style={{ textShadow: '0 0 40px rgba(201,168,76,0.25)' }}>
                404
              </div>
            </div>
            <p className="text-center text-[10px] sm:text-xs uppercase tracking-[0.3em] mb-4" style={{ color: '#6B6558' }}>
              Page Not Found
            </p>

            {messages.map((m, i) => {
              if (m.who === 'system') {
                return (
                  <div key={i} className={`font-mono text-[11px] sm:text-xs ${m.className || 'text-white/50'}`}>
                    {m.text}
                  </div>
                )
              }
              if (m.who === 'dev') {
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center gold-text"
                      style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold)' }}>
                      <Terminal size={14} />
                    </div>
                    <div className="max-w-[78%]">
                      <div className="text-[10px] uppercase tracking-widest font-semibold mb-1 gold-text">
                        Sam · Developer
                      </div>
                      <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm"
                        style={{ background: '#141414', color: '#E8E3D5', border: '1px solid #1f1f1f' }}>
                        {m.mono ? (
                          <span className="font-mono text-xs" style={{ color: m.dim ? '#6B6558' : '#C9A84C' }}>{m.text}</span>
                        ) : m.text}
                      </div>
                    </div>
                  </div>
                )
              }
              return (
                <div key={i} className="flex items-start gap-2.5 justify-end">
                  <div className="max-w-[78%]">
                    <div className="text-[10px] uppercase tracking-widest font-semibold mb-1 text-right"
                      style={{ color: '#6B6558' }}>
                      You
                    </div>
                    <div className="px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-sm text-dark"
                      style={{ background: 'var(--gold)' }}>
                      {m.text}
                    </div>
                  </div>
                  <div className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center"
                    style={{ background: '#1a1a1a', color: 'var(--gold)', border: '1px solid #2a2a2a' }}>
                    <MessageSquare size={13} />
                  </div>
                </div>
              )
            })}

            {typing && (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center gold-text"
                  style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold)' }}>
                  <Terminal size={14} />
                </div>
                <div className="px-3.5 py-3 rounded-2xl rounded-tl-sm"
                  style={{ background: '#141414', border: '1px solid #1f1f1f' }}>
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 bounce-dot" />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 bounce-dot" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 bounce-dot" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick replies */}
          {booted && stage === 2 && availableReplies.length > 0 && !typing && (
            <div className="mt-5 flex flex-wrap gap-2 justify-end">
              {availableReplies.map((r, i) => (
                <button key={i}
                  onClick={() => handleQuickReply(r)}
                  className="px-3 py-1.5 text-xs rounded-full transition-all hover:scale-[1.03]"
                  style={{ background: 'transparent', color: 'var(--gold)', border: '1px solid var(--gold-dim)' }}>
                  {r.text}
                </button>
              ))}
            </div>
          )}

          {/* Free input */}
          {booted && stage === 3 && !typing && (
            <form onSubmit={handleSend} className="mt-5 flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Say something…"
                className="flex-1 bg-black/60 px-3.5 py-2.5 text-sm rounded-full outline-none font-mono"
                style={{ border: '1px solid #1f1f1f', color: '#E8E3D5' }}
                autoFocus
              />
              <button type="submit"
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105 active:scale-95"
                style={{ background: 'var(--gold)', color: '#0A0A0A' }}>
                <Send size={15} className="ml-0.5" />
              </button>
            </form>
          )}
        </div>

        {/* Action bar */}
        <div className="px-4 py-4 rounded-b-sm flex flex-col sm:flex-row gap-2.5"
          style={{ background: '#0c0c0c', borderTop: '1px solid #1a1a1a' }}>
          <button onClick={goHome}
            className="flex-1 btn-gold py-2.5 text-xs sm:text-sm inline-flex items-center justify-center gap-2">
            <Home size={14} /> Take Me Home
          </button>
          <button onClick={goBack}
            className="btn-dark px-5 py-2.5 text-xs sm:text-sm inline-flex items-center justify-center gap-2">
            <ArrowLeft size={14} /> Go Back
          </button>
        </div>

        <p className="text-center text-[10px] font-mono mt-3 tracking-wider" style={{ color: '#3d3830' }}>
          DLE ENTERTAINMENT · 404 · SIGNAL LOST · v1.0
        </p>
      </div>

      <style jsx>{`
        #notfound-chat-scroll::-webkit-scrollbar { width: 6px; }
        #notfound-chat-scroll::-webkit-scrollbar-track { background: transparent; }
        #notfound-chat-scroll::-webkit-scrollbar-thumb { background: #1f1f1f; border-radius: 3px; }
        .bounce-dot {
          animation: bounce 1s infinite;
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
