'use client'
import { useEffect, useState, useRef } from 'react'
import { Volume2, VolumeX, SkipForward } from 'lucide-react'

/**
 * AnnouncementPopup — full-screen site-wide announcement overlay.
 *
 * DESKTOP + MOBILE optimized:
 *   - Safe-area aware (notch / home-indicator padding via env(safe-area-inset-*))
 *   - 44×44px minimum touch targets for all buttons (WCAG / iOS HIG)
 *   - Responsive type scale that shrinks gracefully on phones
 *   - Top bar stacks vertically on narrow screens so long titles don't push the
 *     skip button off-screen
 *   - Video scales to fit within the viewport without cropping, with
 *     playsInline + correct attribute set for iOS Safari
 *   - Image uses object-contain so full poster is always visible, no cropping
 *   - Bottom progress bar sits above the home-indicator safe area
 *   - Lock body scroll while the popup is open
 *   - Fireworks & balloon effects scale down their particle count on mobile
 *     to keep the animation smooth.
 */
export default function AnnouncementPopup() {
  const [announcement, setAnnouncement] = useState(null)
  const [visible, setVisible] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [muted, setMuted] = useState(true)
  const [timeLeft, setTimeLeft] = useState(0)
  const videoRef = useRef(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    ;(async () => {
      try {
        const res = await fetch('/api/announcements', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        const a = data?.announcement
        if (!a) return

        if (a.showOncePerUser && typeof window !== 'undefined') {
          const key = `dle_ann_seen_${a.id}`
          if (window.localStorage.getItem(key) === '1') return
        }

        setAnnouncement(a)
        setTimeLeft(a.durationSec || 8)
        setTimeout(() => setVisible(true), 80)
      } catch (_) { /* never break the page */ }
    })()
  }, [])

  // Lock body scroll while visible (prevents background page from scrolling
  // when the user drags on the popup on iOS).
  useEffect(() => {
    if (!visible) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [visible])

  // Auto-countdown for image announcements.
  useEffect(() => {
    if (!visible || !announcement) return
    if (announcement.type !== 'image') return
    setTimeLeft(announcement.durationSec || 8)
    const start = Date.now()
    const total = (announcement.durationSec || 8) * 1000
    const tick = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, total - elapsed)
      setTimeLeft(Math.ceil(remaining / 1000))
      if (remaining <= 0) {
        clearInterval(tick)
        handleSkip('autodismiss')
      }
    }, 150)
    return () => clearInterval(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, announcement])

  useEffect(() => {
    if (visible && announcement) setLoaded(true)
  }, [visible, announcement])

  const handleSkip = (reason) => {
    if (!announcement) return
    if (announcement.showOncePerUser && typeof window !== 'undefined') {
      try { window.localStorage.setItem(`dle_ann_seen_${announcement.id}`, '1') } catch (_) {}
    }
    setVisible(false)
    setTimeout(() => {
      setAnnouncement(null)
      setLoaded(false)
    }, 320)
    if (reason !== 'autodismiss') {
      fetch(`/api/announcements/${announcement.id}/skip`, {
        method: 'POST',
        keepalive: true,
      }).catch(() => {})
    }
  }

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  if (!announcement) return null

  const isVideo = announcement.type === 'video'
  const effect = announcement.effect || 'none'
  const progress = isVideo
    ? 0
    : Math.max(0, Math.min(1, 1 - timeLeft / (announcement.durationSec || 8)))

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col transition-all duration-300 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        background: 'rgba(0,0,0,0.94)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        // Safe-area padding for notched phones (top) + home-indicator phones (bottom)
        paddingTop: 'max(env(safe-area-inset-top), 12px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
        paddingLeft: 'max(env(safe-area-inset-left), 0px)',
        paddingRight: 'max(env(safe-area-inset-right), 0px)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={announcement.title || 'Announcement'}
    >
      {/* ===== EFFECT LAYERS ===== */}
      {loaded && effect === 'fireworks' && <Fireworks />}
      {loaded && effect === 'balloons' && <Balloons />}

      {/* ===== TOP BAR (title + controls) ===== */}
      <div
        className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-4 sm:px-6 md:px-8"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Left: label + title + message */}
        <div className="flex-1 min-w-0 text-center sm:text-left sm:max-w-[70%]">
          <p
            className="gold-text/80 font-semibold uppercase tracking-[0.25em] mb-1.5"
            style={{ fontSize: 'clamp(9px, 2.2vw, 12px)' }}
          >
            {isVideo ? 'Now Playing' : 'Announcement'}
          </p>
          <h2
            className="font-display font-bold uppercase text-white leading-tight drop-shadow-lg break-words"
            style={{
              fontSize: 'clamp(20px, 5.5vw, 42px)',
              letterSpacing: '0.02em',
              textShadow: '0 4px 24px rgba(0,0,0,0.8)',
            }}
          >
            {announcement.title}
          </h2>
          {announcement.message && (
            <p
              className="text-white/80 mt-2 leading-snug max-w-2xl mx-auto sm:mx-0 drop-shadow"
              style={{ fontSize: 'clamp(11px, 2.8vw, 15px)' }}
            >
              {announcement.message}
            </p>
          )}
        </div>

        {/* Right: controls (timer, mute, skip) */}
        <div
          className="flex items-center justify-center sm:justify-end gap-2 flex-shrink-0"
          style={{ paddingTop: 2 }}
        >
          {!isVideo && (
            <span
              className="inline-flex items-center justify-center h-11 px-3.5 text-xs sm:text-sm font-mono font-semibold text-white/90 rounded-full select-none"
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.25)',
                minWidth: 56,
              }}
            >
              {timeLeft}s
            </span>
          )}
          {isVideo && (
            <button
              onClick={toggleMute}
              className="w-11 h-11 rounded-full flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all"
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          )}
          <button
            onClick={() => handleSkip('user')}
            className="inline-flex items-center gap-1.5 px-5 h-11 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider text-black active:scale-95 transition-all"
            style={{
              background: 'var(--gold, #C9A84C)',
              boxShadow: '0 6px 20px rgba(201,168,76,0.35)',
              minWidth: 96,
            }}
            aria-label="Skip announcement"
          >
            <SkipForward size={15} /> Skip
          </button>
        </div>
      </div>

      {/* ===== MEDIA (centered, flex-1 to fill remaining space) ===== */}
      <div className="relative z-[5] flex-1 flex items-center justify-center w-full min-h-0 px-3 sm:px-6 md:px-10 py-4 sm:py-6">
        {isVideo ? (
          <video
            ref={videoRef}
            src={announcement.mediaUrl}
            className="max-w-full max-h-full rounded-lg sm:rounded-xl shadow-2xl"
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '100%',
              objectFit: 'contain',
              // Important for iOS:
              WebkitPlaysInline: true,
            }}
            autoPlay
            muted
            playsInline
            // @ts-ignore (non-standard attrs needed for iOS Safari)
            webkit-playsinline="true"
            x5-playsinline="true"
            controls={false}
            onEnded={() => handleSkip('video-ended')}
            onError={() => handleSkip('error')}
          />
        ) : (
          <img
            src={announcement.mediaUrl}
            alt={announcement.title}
            className="max-w-full max-h-full object-contain rounded-lg sm:rounded-xl shadow-2xl"
            style={{
              width: 'auto',
              height: 'auto',
              // On mobile, cap width so it doesn't butt against the edges
              // and max-height so the controls + progress bar always fit.
              maxWidth: '100%',
              maxHeight: 'min(72vh, 80dvh)',
            }}
            onError={() => handleSkip('error')}
          />
        )}
      </div>

      {/* ===== BOTTOM PROGRESS BAR (image only) ===== */}
      {!isVideo && (
        <div
          className="relative z-10 flex justify-center px-6 sm:px-10"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
        >
          <div
            className="w-full max-w-md h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.18)' }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-200 ease-linear"
              style={{
                width: `${progress * 100}%`,
                background: 'var(--gold, #C9A84C)',
                boxShadow: '0 0 12px rgba(201,168,76,0.7)',
              }}
            />
          </div>
        </div>
      )}

      {/* Click-outside backdrop (only for images — videos shouldn't be skipped by accidental taps) */}
      {!isVideo && (
        <button
          aria-hidden="true"
          onClick={() => handleSkip('click-outside')}
          className="absolute inset-0 -z-0"
          tabIndex={-1}
        />
      )}

      {/* Small hint at the very bottom for video: "tap anywhere outside to skip" disabled since we have a big Skip button */}
    </div>
  )
}

/* =========================================================================
   EFFECTS: Fireworks & Balloons
   - Mobile: fewer particles / balloons so the animation stays buttery-smooth
     even on lower-end Android / older iPhones.
   ========================================================================= */

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.matchMedia('(max-width: 767px)').matches || window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return mobile
}

function Fireworks() {
  const isMobile = useIsMobile()
  const burstCount = isMobile ? 4 : 6
  const particleCount = isMobile ? 10 : 16
  const intervalMs = isMobile ? 1100 : 800

  const [bursts, setBursts] = useState([])
  useEffect(() => {
    let id = 0
    let cancelled = false
    const spawn = () => {
      if (cancelled) return
      const newBurst = {
        id: id++,
        x: 10 + Math.random() * 80,
        y: 15 + Math.random() * 45,
        hue: Math.floor(Math.random() * 360),
        count: particleCount,
      }
      setBursts(prev => [...prev, newBurst])
      setTimeout(() => {
        if (cancelled) return
        setBursts(prev => prev.filter(b => b.id !== newBurst.id))
      }, 1400)
    }
    spawn()
    const interval = setInterval(spawn, intervalMs)
    return () => { cancelled = true; clearInterval(interval) }
  }, [particleCount, intervalMs, burstCount])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {bursts.map(b => (
        <div key={b.id} className="absolute" style={{ left: `${b.x}%`, top: `${b.y}%` }}>
          {Array.from({ length: b.count }).map((_, i) => {
            const angle = (i / b.count) * Math.PI * 2
            const dist = 80 + Math.random() * (isMobile ? 80 : 120)
            const tx = Math.cos(angle) * dist
            const ty = Math.sin(angle) * dist
            return (
              <span
                key={i}
                className="absolute rounded-full"
                style={{
                  width: isMobile ? 4 : 5,
                  height: isMobile ? 4 : 5,
                  left: 0, top: 0,
                  background: `hsl(${(b.hue + i * 15) % 360}, 100%, 65%)`,
                  boxShadow: `0 0 ${isMobile ? 8 : 12}px hsl(${(b.hue + i * 15) % 360}, 100%, 70%)`,
                  transform: 'translate(-50%,-50%)',
                  animation: `fw-spark 1.1s ease-out forwards`,
                  ['--tx']: `${tx}px`,
                  ['--ty']: `${ty}px`,
                }}
              />
            )
          })}
        </div>
      ))}
      <style jsx>{`
        @keyframes fw-spark {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.3); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

function Balloons() {
  const isMobile = useIsMobile()
  const count = isMobile ? 8 : 14

  // Pre-seed balloons once (stable across renders) — memoize so they don't
  // re-jitter on every render.
  const balloons = useRef(
    Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: (i / count) * 90 + Math.random() * 8,
      delay: Math.random() * 3,
      dur: 7 + Math.random() * 6,
      hue: Math.floor(Math.random() * 360),
      size: (isMobile ? 24 : 32) + Math.random() * (isMobile ? 20 : 28),
    }))
  ).current

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {balloons.map(b => (
        <div
          key={b.id}
          className="absolute"
          style={{
            left: `${b.left}%`,
            bottom: `-${b.size + 40}px`,
            animation: `bln-rise ${b.dur}s linear ${b.delay}s infinite`,
          }}
        >
          <div
            style={{
              position: 'relative',
              width: b.size,
              height: b.size * 1.2,
              borderRadius: '50% 50% 50% 50% / 45% 45% 55% 55%',
              background: `radial-gradient(circle at 30% 25%, hsla(${b.hue},100%,85%,0.95), hsl(${b.hue},90%,60%) 60%, hsl(${b.hue},90%,45%))`,
              boxShadow: `inset -${Math.max(3, b.size * 0.1)}px -${Math.max(3, b.size * 0.12)}px 0 hsla(${b.hue},90%,35%,0.4), 0 0 14px hsla(${b.hue},90%,60%,0.25)`,
            }}
          />
          {/* Knot highlight */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: -4,
              width: 6, height: 6,
              marginLeft: -3,
              background: `hsl(${b.hue}, 80%, 40%)`,
              borderRadius: '50%',
            }}
          />
          {/* String */}
          <div
            style={{
              margin: '0 auto',
              width: 1,
              height: b.size * 0.8,
              background: 'rgba(255,255,255,0.35)',
              transformOrigin: 'top center',
              animation: `bln-sway ${1.8 + Math.random() * 1.2}s ease-in-out ${b.delay * 0.3}s infinite alternate`,
            }}
          />
        </div>
      ))}
      <style jsx>{`
        @keyframes bln-rise {
          0% { transform: translateY(0) translateX(0) rotate(-2deg); opacity: 0; }
          8% { opacity: 1; }
          50% { transform: translateY(-50vh) translateX(20px) rotate(3deg); }
          92% { opacity: 1; }
          100% { transform: translateY(-110vh) translateX(-10px) rotate(-2deg); opacity: 0; }
        }
        @keyframes bln-sway {
          from { transform: translateX(-3px) rotate(-2deg); }
          to   { transform: translateX(3px) rotate(2deg); }
        }
      `}</style>
    </div>
  )
}
