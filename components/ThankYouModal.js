'use client'
import { useEffect, useRef, useState } from 'react'
import { X, Volume2, VolumeX } from 'lucide-react'

/**
 * ThankYouModal — FULL-SCREEN cinematic popup shown after a successful gift.
 *
 * The thank-you VIDEO fills the entire viewport edge-to-edge (like a movie
 * trailer), audio plays on arrival (mute toggle available), and the
 * "Continue to Site" button sits at the bottom. If every candidate video
 * fails to load, a cinematic gold typographic "Thank You" card fills the
 * screen instead (no mascot / no bunny).
 *
 * Props:
 *   open            : bool
 *   artist          : { name, isGroup, image? }  (null → brand-default)
 *   giftType        : 'food'|'clothes'|'gift'|'money'
 *   tier            : 'high'|'mid'|'low'|'group'
 *   videoCandidates : ordered list of URLs to try (first that loads plays)
 *   preferVideo     : true = attempt video first; false = go straight to text card
 *   onClose         : () => void
 *   autoCloseMs     : ms before auto-close (default 25000 — longer so full videos can finish)
 */
export default function ThankYouModal({
  open,
  artist = null,
  giftType = 'gift',
  tier = 'low',
  videoCandidates = [],
  preferVideo = false,
  onClose = () => {},
  autoCloseMs = 25000,
}) {
  const videoRef = useRef(null)
  const [muted, setMuted] = useState(false) // START WITH SOUND ON (user already clicked pay button = user gesture)
  const [videoEnded, setVideoEnded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [videoIndex, setVideoIndex] = useState(0)
  const [videoReady, setVideoReady] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [needsTapForSound, setNeedsTapForSound] = useState(false)

  const activeVideoUrl = preferVideo && videoCandidates.length > 0 ? videoCandidates[videoIndex] : ''
  const allVideosFailed = preferVideo && videoIndex >= videoCandidates.length
  const mode = preferVideo && activeVideoUrl && !allVideosFailed ? 'video' : 'text'

  const tierLabel = {
    high:  '✨ Gold Supporter',
    mid:   '⭐ Star Fan',
    low:   '🎁 Gift Received',
    group: '💛 Thank You',
  }[tier] || '🎁 Gift Received'
  const displayName = artist?.name || 'DLE Entertainment'
  const giftEmoji = { food: '🍱', clothes: '👗', gift: '🎁', money: '💝' }[giftType] || '🎁'

  // Reset state + kick off entrance animation each time the modal opens
  useEffect(() => {
    if (!open) {
      setMounted(false)
      setVideoEnded(false)
      setVideoError(false)
      setVideoReady(false)
      setVideoIndex(0)
      setMuted(false)
      setNeedsTapForSound(false)
      return
    }
    setVideoError(false)
    setVideoReady(false)
    setVideoEnded(false)
    setVideoIndex(0)
    setMuted(false)
    setNeedsTapForSound(false)
    const t = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(t)
  }, [open, videoCandidates, preferVideo])

  // A video failed → advance to next candidate. When we run out of candidates
  // (index >= length), mode flips to 'text' and the fallback card shows.
  const handleVideoError = () => {
    setVideoReady(false)
    setVideoIndex(i => {
      const next = i + 1
      if (next >= videoCandidates.length) setVideoError(true)
      return next
    })
  }

  // Safety net: if no video starts within 4s (network stall / all 404s),
  // give up and drop to the text card so fans never see a blank screen.
  useEffect(() => {
    if (!open || mode !== 'video') return
    const t = setTimeout(() => {
      if (!videoReady && !videoError) {
        setVideoIndex(videoCandidates.length)
        setVideoError(true)
      }
    }, 4000)
    return () => clearTimeout(t)
  }, [open, mode, videoReady, videoError, videoCandidates.length])

  // Auto-close after timeout
  useEffect(() => {
    if (!open || !autoCloseMs) return
    const t = setTimeout(onClose, autoCloseMs)
    return () => clearTimeout(t)
  }, [open, onClose, autoCloseMs])

  // ESC to close + lock body scroll while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  // Try to unmute on ANY click/tap inside the modal if browser blocked autoplay-with-sound.
  const handleModalInteraction = () => {
    if (needsTapForSound && videoRef.current) {
      videoRef.current.muted = false
      videoRef.current.play().catch(() => {})
      setMuted(false)
      setNeedsTapForSound(false)
    }
  }

  // Autoplay video whenever active URL changes (e.g. after a fallback).
  // Tries SOUND-ON first; if browser blocks, falls back to muted + "Tap for sound" hint.
  useEffect(() => {
    if (mode !== 'video' || !open || !activeVideoUrl) return
    const v = videoRef.current
    if (!v) return
    v.muted = muted
    v.currentTime = 0
    try { v.load() } catch (_) {}
    const tryPlay = () => {
      v.play().then(() => {
        setNeedsTapForSound(false)
      }).catch(() => {
        // Browser blocked autoplay with sound → retry muted, show tap-for-sound hint
        v.muted = true
        setMuted(true)
        v.play().catch(() => {})
        setNeedsTapForSound(true)
      })
    }
    tryPlay()
  }, [mode, open, activeVideoUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMute = () => {
    setMuted(m => {
      const nm = !m
      if (videoRef.current) {
        videoRef.current.muted = nm
        if (!nm) videoRef.current.play().catch(() => {})
      }
      setNeedsTapForSound(false)
      return nm
    })
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: '#000',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
      onClick={handleModalInteraction}
      role="dialog"
      aria-modal="true"
      aria-label={`Thank you from ${displayName}`}
    >
      {/* Edge-to-edge video OR full-bleed text card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ position: 'absolute', inset: 0 }}
      >
        {mode === 'video' ? (
          <FullBleedVideo
            key={activeVideoUrl}
            videoRef={videoRef}
            videoUrl={activeVideoUrl}
            muted={muted}
            onEnded={() => setVideoEnded(true)}
            onError={handleVideoError}
            onReady={() => setVideoReady(true)}
            mounted={mounted}
            videoReady={videoReady}
          />
        ) : (
          <FullBleedTextCard
            artist={artist}
            tierLabel={tierLabel}
            mounted={mounted}
          />
        )}
      </div>

      {/* Top gradient for close-button legibility */}
      <div aria-hidden="true" style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 'max(120px, 20vh)',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 100%)',
        pointerEvents: 'none',
      }} />
      {/* Bottom gradient for CTA legibility */}
      <div aria-hidden="true" style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 'max(220px, 35vh)',
        background: 'linear-gradient(0deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0) 100%)',
        pointerEvents: 'none',
      }} />
      {/* Subtle gold vignette glow */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 40%, rgba(201,168,76,0.08) 0%, rgba(0,0,0,0) 60%)',
      }} />

      {/* Close button */}
      <button
        onClick={e => { e.stopPropagation(); onClose() }}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: 'max(1rem, env(safe-area-inset-top))',
          right: 'max(1rem, env(safe-area-inset-right))',
          zIndex: 5,
          width: 48, height: 48, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(201,168,76,0.45)',
          color: '#C9A84C', cursor: 'pointer',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          opacity: mounted ? 1 : 0, transition: 'opacity 0.4s ease 0.3s',
        }}
      >
        <X size={22} />
      </button>

      {/* Mute button — bottom-left (above CTA) */}
      {mode === 'video' && (
        <button
          onClick={e => { e.stopPropagation(); toggleMute() }}
          aria-label={muted ? 'Unmute' : 'Mute'}
          style={{
            position: 'absolute',
            bottom: 'max(9rem, calc(env(safe-area-inset-bottom) + 9rem))',
            left: 'max(1rem, env(safe-area-inset-left))',
            zIndex: 5,
            width: 48, height: 48, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(201,168,76,0.45)',
            color: '#C9A84C', cursor: 'pointer',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      )}

      {/* "Tap for sound" hint (only when autoplay-with-sound was blocked) */}
      {mode === 'video' && needsTapForSound && (
        <div
          onClick={e => { e.stopPropagation(); toggleMute() }}
          style={{
            position: 'absolute',
            bottom: 'max(9rem, calc(env(safe-area-inset-bottom) + 9rem))',
            left: 'max(4.5rem, calc(env(safe-area-inset-left) + 4.5rem))',
            zIndex: 5,
            padding: '0.55rem 1rem',
            borderRadius: 999,
            background: 'rgba(201,168,76,0.2)',
            border: '1px solid rgba(201,168,76,0.6)',
            color: '#f5d98a',
            fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer',
            animation: 'thankyou-pulse-hint 1.4s ease-in-out infinite',
            backdropFilter: 'blur(6px)',
          }}
        >
          🔊 Tap for sound
        </div>
      )}

      {/* Bottom CTA */}
      <div style={{
        position: 'absolute',
        bottom: 'max(2rem, env(safe-area-inset-bottom))',
        left: 0, right: 0, textAlign: 'center', zIndex: 3,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.9rem',
        padding: '0 1.5rem',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.6s ease 0.8s, transform 0.6s ease 0.8s',
      }}>
        {/* Tier label overlaid on VIDEO only (text card already has its own chip inside) */}
        {mode === 'video' && (
          <div style={{
            display: 'inline-block',
            padding: '0.35rem 1rem',
            border: '1px solid rgba(201,168,76,0.5)',
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            marginBottom: '0.25rem',
          }}>
            <div style={{
              fontFamily: 'var(--font-display), Oswald, sans-serif',
              fontSize: 'clamp(10px, 2.4vw, 12px)', letterSpacing: '0.3em',
              color: '#C9A84C', textTransform: 'uppercase', fontWeight: 600,
            }}>
              {tierLabel}
            </div>
          </div>
        )}

        <div style={{
          fontSize: 'clamp(12px, 2.6vw, 16px)', color: 'rgba(255,255,255,0.85)',
          letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500,
          textShadow: '0 2px 10px rgba(0,0,0,0.8)',
        }}>
          Your {giftEmoji} {giftType === 'money' ? 'cash tip' : giftType} has been sent.
        </div>
        <button
          onClick={e => { e.stopPropagation(); onClose() }}
          style={{
            background: 'linear-gradient(135deg, #C9A84C 0%, #e8cf7b 50%, #C9A84C 100%)',
            color: '#0A0A0A',
            fontFamily: 'var(--font-display), Oswald, sans-serif',
            fontWeight: 700,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            border: 'none', cursor: 'pointer',
            padding: '1rem 3rem',
            minHeight: 52,
            fontSize: 'clamp(12px, 2.8vw, 14px)',
            borderRadius: 2,
            boxShadow: '0 6px 30px rgba(201,168,76,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
          }}
        >
          Continue to Site
        </button>
      </div>

      <style jsx global>{`
        @keyframes thankyou-video-in {
          0%   { opacity: 0; transform: scale(1.04); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes thankyou-card-in {
          0%   { opacity: 0; transform: scale(0.98); filter: blur(8px); }
          100% { opacity: 1; transform: scale(1);    filter: blur(0); }
        }
        @keyframes thankyou-ring {
          0%   { opacity: 0; transform: translate(-50%,-50%) scale(0.6); }
          100% { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        }
        @keyframes thankyou-sparkle {
          0%,100% { opacity: 0; transform: scale(0.3); }
          50%     { opacity: 1; transform: scale(1.1); }
        }
        @keyframes thankyou-pulse {
          0%,100% { opacity: 0.55; transform: translate(-50%,-50%) scale(1); }
          50%     { opacity: 1;    transform: translate(-50%,-50%) scale(1.12); }
        }
        @keyframes thankyou-pulse-hint {
          0%,100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.45); }
          50%     { box-shadow: 0 0 0 10px rgba(201,168,76,0); }
        }
        @keyframes thankyou-portrait-in {
          0%   { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

/* ========================== FULL-BLEED VIDEO ==========================
 * Fills the entire viewport edge-to-edge. Uses object-fit: cover so the video
 * bleeds to every edge like a movie trailer. Black is the base so any
 * letterboxing on unusual aspect ratios blends in.
 */
function FullBleedVideo({ videoRef, videoUrl, muted, onEnded, onError, onReady, mounted, videoReady }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#000',
      opacity: mounted && videoReady ? 1 : 0,
      animation: mounted && videoReady ? 'thankyou-video-in 0.8s ease forwards' : 'none',
    }}>
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay
        playsInline
        webkit-playsinline="true"
        x5-playsinline="true"
        muted={muted}
        onEnded={onEnded}
        onError={onError}
        onCanPlay={onReady}
        onLoadedData={onReady}
        preload="auto"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          objectPosition: 'center center',
          display: 'block',
          background: '#000',
        }}
      />
    </div>
  )
}

/* ========================== FULL-BLEED TEXT CARD (fallback) ==========================
 * Cinematic gold typographic "Thank You" covering the entire screen. Used when
 * no MP4 has been uploaded for the tier yet, or when all video URLs fail.
 * Concentric gold rings, sparkles, pulse glow, artist name in Pinyon Script.
 */
function useSparkles() {
  const [s] = useState(() => {
    const colors = ['#C9A84C', '#f5d98a', '#ffffff']
    const out = []
    for (let i = 0; i < 16; i++) {
      out.push({
        left: `${5 + Math.random() * 90}%`,
        top: `${5 + Math.random() * 90}%`,
        size: `${10 + Math.random() * 18}px`,
        dur: 1.4 + Math.random() * 2.0,
        delay: Math.random() * 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }
    return out
  })
  return s
}

function FullBleedTextCard({ artist, tierLabel, mounted }) {
  const sparkles = useSparkles()
  const artistImage = artist?.image || ''
  const artistName = artist?.name || 'DLE Entertainment'

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'radial-gradient(ellipse at center, #0f0d08 0%, #000 70%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: mounted ? 1 : 0,
      transition: 'opacity 0.6s ease 0.2s',
      overflow: 'hidden',
    }}>
      {/* Central gold glow */}
      <div aria-hidden="true" style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
        width: '85%', height: '85%', borderRadius: '50%',
        background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.28) 0%, rgba(201,168,76,0) 65%)',
        animation: 'thankyou-pulse 2.8s ease-in-out infinite',
      }} />

      {/* Concentric gold rings */}
      <div aria-hidden="true" style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
        width: 'min(70vh, 85vw)', aspectRatio: '1', borderRadius: '50%',
        border: '1px solid rgba(201,168,76,0.18)',
        boxShadow: 'inset 0 0 60px rgba(201,168,76,0.05), 0 0 60px rgba(201,168,76,0.08)',
        animation: mounted ? 'thankyou-ring 3s ease-in-out 0.3s both' : 'none',
      }} />
      <div aria-hidden="true" style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
        width: 'min(52vh, 66vw)', aspectRatio: '1', borderRadius: '50%',
        border: '1px solid rgba(201,168,76,0.32)',
        animation: mounted ? 'thankyou-ring 3s ease-in-out 0.6s both' : 'none',
      }} />

      {/* Sparkles */}
      {sparkles.map((s, i) => (
        <span key={i} aria-hidden="true" style={{
          position: 'absolute', left: s.left, top: s.top,
          fontSize: s.size, color: s.color,
          animation: `thankyou-sparkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          textShadow: `0 0 14px ${s.color}`,
          zIndex: 2,
        }}>✦</span>
      ))}

      {/* Central text block */}
      <div style={{
        position: 'relative', zIndex: 3, textAlign: 'center',
        padding: '2rem',
        animation: mounted ? 'thankyou-card-in 1s cubic-bezier(0.22,1,0.36,1) 0.3s both' : 'none',
      }}>
        <div style={{
          fontFamily: 'var(--font-display), Oswald, sans-serif',
          fontSize: 'clamp(48px, 13vw, 120px)',
          fontWeight: 700, letterSpacing: '0.16em',
          color: '#C9A84C', textTransform: 'uppercase', lineHeight: 1,
          textShadow: '0 0 50px rgba(201,168,76,0.45), 0 4px 20px rgba(0,0,0,0.7)',
        }}>
          <span style={{ opacity: 0.7, fontSize: '0.5em', verticalAlign: 'middle', marginRight: '0.3em' }}>✦</span>
          Thank You
          <span style={{ opacity: 0.7, fontSize: '0.5em', verticalAlign: 'middle', marginLeft: '0.3em' }}>✦</span>
        </div>

        <div style={{
          fontFamily: 'var(--font-script), \"Pinyon Script\", cursive',
          fontSize: 'clamp(36px, 8vw, 78px)', color: '#f5d98a',
          marginTop: '0.8rem', lineHeight: 1.1,
          textShadow: '0 0 40px rgba(245,217,138,0.4)',
        }}>
          from {artistName}
        </div>

        <div style={{
          marginTop: '1.75rem',
          display: 'inline-block',
          padding: '0.55rem 1.75rem',
          border: '1px solid rgba(201,168,76,0.55)',
          background: 'linear-gradient(135deg, rgba(201,168,76,0.18), rgba(201,168,76,0.04))',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}>
          <div style={{
            fontFamily: 'var(--font-display), Oswald, sans-serif',
            fontSize: 'clamp(11px, 2.6vw, 14px)', letterSpacing: '0.3em',
            color: '#C9A84C', textTransform: 'uppercase', fontWeight: 600,
          }}>
            {tierLabel}
          </div>
        </div>
      </div>

      {/* Artist portrait thumbnail (top-right, subtle) */}
      {artistImage && (
        <div style={{
          position: 'absolute',
          top: 'max(5rem, calc(env(safe-area-inset-top) + 5rem))',
          right: 'max(1.5rem, env(safe-area-inset-right))',
          zIndex: 4,
          width: 'clamp(64px, 12vw, 100px)', height: 'clamp(64px, 12vw, 100px)',
          borderRadius: '50%', overflow: 'hidden',
          border: '2px solid #C9A84C',
          boxShadow: '0 0 24px rgba(201,168,76,0.5)',
          opacity: mounted ? 1 : 0,
          animation: mounted ? 'thankyou-portrait-in 0.9s ease 1.4s forwards' : 'none',
          background: '#0A0A0A',
        }}>
          <img src={artistImage} alt={artistName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
    </div>
  )
}
