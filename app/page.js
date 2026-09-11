'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { ChevronDown, Play, Pause, Volume2, VolumeX, Search, Mail } from 'lucide-react'
import VideoModal from '@/components/VideoModal'
import toast from 'react-hot-toast'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { MobileSwipeRow, DesktopCarousel } from '@/components/TalentCarousel'

/*
 * HeroBackgroundVideo
 * Full-bleed background video that covers the entire hero section.
 * Loads /uploads/videos/home-montage.mp4 with autoplay/muted/loop.
 * If the file is missing, falls back to the solid taupe background.
 */
function HeroBackgroundVideo() {
  const videoRef = useRef(null)
  const [videoReady, setVideoReady] = useState(true)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const [showControls, setShowControls] = useState(false)
  // Don't force preload the whole video on mobile/metered connections —
  // only preload metadata so the poster shows up fast and playback starts
  // when the browser decides it has spare bandwidth.
  const [shouldPreloadAuto, setShouldPreloadAuto] = useState(false)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    // Heuristic: preload=auto on desktop / fast connections; metadata-only on mobile
    const isSmall = window.matchMedia('(max-width: 1023px)').matches
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    const isSlow = conn && (conn.saveData || /2g|3g|slow-2g/i.test(conn.effectiveType || ''))
    if (!isSmall && !isSlow) {
      v.preload = 'auto'
      setShouldPreloadAuto(true)
    } else {
      v.preload = 'metadata'
    }
    const tryPlay = () => { v.play().catch(() => {}) }
    // Small delay so the hero text/logo render first, then the video starts
    const t = setTimeout(tryPlay, 150)
    return () => clearTimeout(t)
  }, [])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setIsPlaying(true) }
    else { v.pause(); setIsPlaying(false) }
  }

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setIsMuted(v.muted)
  }

  if (!videoReady) return null

  return (
    <>
      {/* Full-bleed video — NO overlays, NO tints, NO vignettes, NO grey wash */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        src="/uploads/videos/home-montage.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload={shouldPreloadAuto ? 'auto' : 'metadata'}
        poster="/uploads/images/home/video-poster.webp"
        onError={() => setVideoReady(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Tiny playback controls in top-right corner (visible on hover/focus) */}
      <div
        className="absolute top-4 right-4 z-30 flex gap-2 opacity-0 transition-opacity duration-300"
        style={{ opacity: showControls ? 1 : undefined }}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
          className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm transition"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm transition"
        >
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      </div>
    </>
  )
}

/*
 * TalentCard
 * Larger, cinematic card matching the Our Talents section screenshot:
 * rounded corners, image top, gold gradient footer with Name (big), Bio, Group tag.
 */
function TalentCard({ artist, onClick, featured }) {
  return (
    <div
      className="relative overflow-hidden cursor-pointer group rounded-t-[18px] rounded-b-[14px] transition-transform duration-300 hover:scale-[1.03] active:scale-95"
      onClick={onClick}
      style={{ aspectRatio: '3/4', minWidth: 0 }}
    >
      {/* Image */}
      {artist.image ? (
        <img
          src={artist.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          decoding="async"
          width={400}
          height={533}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1610] to-[#0A0806] text-white/30 font-display text-5xl">
          {artist.name?.[0] || '?'}
        </div>
      )}

      {/* Top dark fade for image */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 50%, rgba(90,74,34,0.85) 78%, rgba(60,48,18,0.95) 100%)',
        }}
      />

      {/* Gold footer content */}
      <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 flex flex-col justify-end pointer-events-none">
        <h3
          className="font-display text-white uppercase leading-[1.0] tracking-wide"
          style={{
            fontSize: featured ? 'clamp(1.5rem, 2.6vw, 2.4rem)' : 'clamp(1.15rem, 2vw, 1.75rem)',
            textShadow: '0 2px 10px rgba(0,0,0,0.7)',
          }}
        >
          {artist.name}
        </h3>
        {artist.title && (
          <p className="text-white/85 text-[10px] md:text-xs uppercase tracking-widest mt-1 truncate">
            {artist.title}
          </p>
        )}
        {artist.isGroup && (
          <span className="mt-1.5 self-end text-white/90 text-sm md:text-base font-display uppercase tracking-wider">
            Group
          </span>
        )}
      </div>
    </div>
  )
}

function HomeContent() {
  const { data: session, status: sessionStatus } = useSession()
  const [artists, setArtists] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [homeQuery, setHomeQuery] = useState('')
  const [homeFilter, setHomeFilter] = useState('all')
  const searchParams = useSearchParams()
  const isSignedIn = sessionStatus === 'authenticated' && !!session?.user

  useEffect(() => {
    // Browser-cache the artist list — served from CDN in ~50ms for repeat visits
    // and new devices after the first global cache fill.
    fetch('/api/artists', { cache: 'force-cache' }).then(r => r.json()).then(data => {
      setArtists(Array.isArray(data) ? data : [])
      setLoading(false)
    }).catch(() => setLoading(false))

    const result = searchParams?.get('donation')
    if (result === 'success') toast.success('🎉 Thank you for your support! Payment received.')
    else if (result === 'cancelled') toast('Payment cancelled.', { icon: 'ℹ️' })
  }, [searchParams])

  // Show first 8 artists on homepage (mix of groups + solo + members)
  const groups = artists.filter(a => a.isGroup)
  const individuals = artists.filter(a => !a.isGroup)
  const visibleGroups = groups.slice(0, 2)
  const visibleIndividuals = individuals.slice(0, 8 - visibleGroups.length)
  const hasMore = artists.length > visibleGroups.length + visibleIndividuals.length

  const getMembers = (groupId) => artists.filter(a => a.groupId && String(a.groupId) === String(groupId))
  const parentGroup = (a) => a.groupId ? groups.find(g => String(g._id) === String(a.groupId)) : null

  // Filtered list for Our Talents section (search + ALL/GROUP/ARIST)
  const homeFiltered = artists.filter(a => {
    if (homeFilter === 'group' && !a.isGroup) return false
    if (homeFilter === 'solo' && a.isGroup) return false
    const q = homeQuery.trim().toLowerCase()
    if (!q) return true
    return (
      a.name?.toLowerCase().includes(q) ||
      a.title?.toLowerCase().includes(q) ||
      a.bio?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="cinematic-dark">
      {/* ========================================== */}
      {/* HERO — full-bleed background video + overlays */}
      {/* ========================================== */}
      <section
        className="relative w-full"
        style={{ background: '#0A0A0A' }}
      >
        {/* Viewport height container */}
        <div className="relative w-full overflow-hidden" style={{ minHeight: 'calc(100dvh - var(--nav-h))' }}>

          {/* Layer 1: full-bleed background video */}
          <HeroBackgroundVideo />

          {/* Dark gradient: gentle bottom fade so artist in front shows clearly */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none z-[5]"
            style={{
              background:
                'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.30) 70%, rgba(0,0,0,0.60) 100%)',
            }}
          />
          {/* Side darkening on mobile for contrast */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none z-[5] lg:hidden"
            style={{
              background:
                'radial-gradient(ellipse at 50% 25%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 75%)',
            }}
          />

          {/* ===== MOBILE/TABLET HERO (< lg): content top, artist bottom-right in front ===== */}
          <div
            className="lg:hidden relative z-10 w-full h-full flex flex-col justify-between px-5 pt-4 sm:pt-6 pb-2"
            style={{ minHeight: 'calc(100dvh - var(--nav-h))' }}
          >
            {/* TOP: content block — sits above artist so text & buttons are never covered */}
            <div className="flex flex-col items-center text-center w-full relative z-20">
              {/* Shield logo */}
              <img
                src="/dlelogo/dle-logo-sm.webp"
                alt="DLE"
                className="w-[85px] sm:w-[105px] h-auto"
                style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.55))' }}
                fetchPriority="high"
              />
              {/* Wordmark */}
              <div className="mt-1.5 mb-3 flex flex-col items-center">
                <p
                  className="font-display font-semibold text-white/90 text-center"
                  style={{ fontSize: 'clamp(8px, 2.3vw, 11px)', letterSpacing: '0.25em', textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}
                >
                  D L E   E N T E R T A I N M E N T
                </p>
                <p className="text-white/65 text-center mt-0.5"
                   style={{ fontSize: 'clamp(7px, 1.8vw, 9px)', letterSpacing: '0.15em', textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}>
                  Live · Create · Perform · Inspire
                </p>
              </div>

              {/* Headline */}
              <div className="leading-none">
                <p
                  className="text-white leading-[0.9]"
                  style={{
                    fontFamily: '"Pinyon Script", "Great Vibes", cursive',
                    textShadow: '0 4px 20px rgba(0,0,0,0.7)',
                    fontSize: 'clamp(30px, 8vw, 46px)',
                  }}
                >
                  Redifining <span className="italic">The</span>
                </p>
                <h1
                  className="font-display font-bold uppercase gold-text -mt-0.5"
                  style={{
                    fontSize: 'clamp(52px, 14vw, 86px)',
                    lineHeight: 0.85,
                    letterSpacing: '0.02em',
                    textShadow: '0 6px 24px rgba(0,0,0,0.6)',
                  }}
                >
                  VISION
                </h1>
              </div>

              {/* Tagline */}
              <p className="text-white/95 mt-2.5 leading-snug font-medium max-w-sm"
                 style={{ fontSize: 'clamp(12px, 3.2vw, 15px)', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                Elite infrastructure for artists who choose to Do Life Electric.
              </p>

              {/* Buttons — higher z-index so they stay visible and clickable over the character */}
              <div className="relative z-20 mt-4 flex flex-col gap-2 w-full max-w-[260px]">
                <a href="#talents" className="btn-hero-gold !min-w-0 !w-full" style={{ padding: '0.75rem 1.1rem', fontSize: 'clamp(13px, 3.4vw, 15px)', minHeight: 48 }}>Explore the Roster</a>
                <Link href="/about" className="btn-hero-dark !min-w-0 !w-full" style={{ background: 'linear-gradient(180deg, rgba(30,30,30,0.95) 0%, rgba(10,10,10,0.95) 100%)', border: '1px solid rgba(255,255,255,0.2)', padding: '0.75rem 1.1rem', fontSize: 'clamp(13px, 3.4vw, 15px)', minHeight: 48 }}>Our Story</Link>
              </div>
            </div>

            {/* Spacer positions the chevron/artist below buttons — sized so artist's head is just under OUR STORY */}
            <div className="flex-1 min-h-[100px] sm:min-h-[140px]" />

            {/* Down arrow */}
            <div className="relative flex justify-center z-20">
              <a
                href="#talents"
                className="text-white/70 hover:text-gold transition-colors"
                aria-label="Scroll down"
              >
                <ChevronDown size={22} strokeWidth={2} />
              </a>
            </div>
          </div>

          {/* Mobile/tablet artist — smaller, bottom-right, head just under the OUR STORY button */}
          <div className="lg:hidden absolute inset-x-0 bottom-0 z-[5] pointer-events-none flex items-end justify-end">
            <img
              src="/uploads/images/home/hero-artist.webp"
              alt="DLE Artist"
              className="block w-auto"
              style={{
                height: 'min(62vh, 400px)',
                maxHeight: '66dvh',
                marginRight: '-6%',
                marginBottom: '-4%',
                filter: 'drop-shadow(0 -10px 30px rgba(0,0,0,0.5))',
              }}
             loading="lazy" decoding="async" />
          </div>

          {/* ===== DESKTOP HERO (lg+): original approved left-aligned layout ===== */}
          <div
            className="hidden lg:flex relative z-10 w-full h-full pt-14 lg:pt-16 pb-20 pl-10 lg:pl-14 pr-[32%] xl:pr-[30%] items-center"
            style={{ minHeight: 'calc(100dvh - var(--nav-h))' }}
          >
            <div className="flex flex-col items-start text-left max-w-2xl">
              <div className="flex flex-col items-center w-full">
                <img src="/dlelogo/dle-logo-sm.webp" alt="DLE" className="w-[240px] h-auto"
                  style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.55))' }} />
                <div className="mt-3 mb-10 flex flex-col items-center">
                  <p className="font-display font-semibold text-white/90 text-sm text-center"
                     style={{ letterSpacing: '0.45em', textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}>
                    D L E   E N T E R T A I N M E N T
                  </p>
                  <p className="text-white/65 text-[11px] tracking-[0.3em] uppercase mt-1 text-center"
                     style={{ textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}>
                    Live · Create · Perform · Inspire
                  </p>
                </div>
              </div>
              <div className="leading-none self-start">
                <p className="text-white leading-[0.85]"
                  style={{ fontFamily: '"Pinyon Script", "Great Vibes", cursive', textShadow: '0 4px 20px rgba(0,0,0,0.7)', fontSize: 'clamp(36px, 4.4vw, 60px)' }}>
                  Redifining <span className="italic">The</span>
                </p>
                <h1 className="font-display font-bold uppercase tracking-[0.04em] -mt-2 gold-text text-left"
                  style={{ fontSize: 'clamp(88px, 10.5vw, 160px)', lineHeight: 0.85, textShadow: '0 6px 24px rgba(0,0,0,0.6)' }}>
                  VISION
                </h1>
              </div>
              <p className="text-white/90 text-base max-w-md mt-6 leading-snug font-medium text-left"
                 style={{ textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}>
                Elite infrastructure for artists who choose to<br />Do Life Electric.
              </p>
              <div className="mt-9 flex flex-col gap-3 w-full max-w-[300px]">
                <a href="#talents" className="btn-hero-gold">Explore the Roster</a>
                <Link href="/about" className="btn-hero-dark" style={{ background: 'linear-gradient(180deg, rgba(30,30,30,0.95) 0%, rgba(10,10,10,0.95) 100%)', border: '1px solid rgba(255,255,255,0.15)' }}>Our Story</Link>
              </div>
            </div>
          </div>

          {/* Desktop artist (right side) */}
          <div className="hidden lg:block absolute right-0 bottom-0 z-20 pointer-events-none">
            <img
              src="/uploads/images/home/hero-artist.webp"
              alt="DLE Artist"
              className="block w-auto"
              style={{
                height: 'min(92vh, 500px)',
                maxHeight: 'calc(100dvh - var(--nav-h))',
                filter: 'drop-shadow(-20px 20px 40px rgba(0,0,0,0.35))',
              }}
             loading="lazy" decoding="async" />
          </div>

          {/* Desktop down arrow */}
          <a
            href="#talents"
            className="hidden lg:flex absolute bottom-5 left-1/2 -translate-x-1/2 z-30 text-white/60 hover:text-gold transition-colors"
            aria-label="Scroll down"
          >
            <ChevronDown size={30} strokeWidth={2} />
          </a>
        </div>
      </section>

      {/* ========================================== */}
      {/* OUR TALENTS — matches the /artists page design (full-width dark textured) */}
      {/* ========================================== */}
      <section
        id="talents"
        className="relative w-full overflow-hidden pt-10 pb-6 md:pt-14 md:pb-10 px-4 sm:px-6"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.10) 0%, rgba(0,0,0,0) 45%), #0A0806',
        }}
      >
        {/* Subtle DLE watermark shield in background */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 opacity-[0.05]"
          aria-hidden="true"
        >
          <img src="/dlelogo/dle-logo-sm.webp" alt="" className="w-[700px] max-w-none select-none" />
        </div>
        {/* Grain/texture overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Heading block */}
          <div className="text-center mb-8 md:mb-12 px-2">
            <h2
              className="font-display font-bold uppercase tracking-[0.03em] leading-none gold-text"
              style={{ fontSize: 'clamp(42px, 12vw, 120px)' }}
            >
              Our Talents
            </h2>
            <p className="text-white/85 max-w-4xl mx-auto mt-3 md:mt-4 leading-relaxed font-medium" style={{ fontSize: 'clamp(14px, 3.5vw, 17px)' }}>
              Browse all groups and artists. Click any card or member name to watch their video and send gifts. Every artist — solo or in a group — is listed below.
            </p>
          </div>

          {/* Search + filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8 md:mb-12 max-w-6xl mx-auto">
            <div className="relative flex-1">
              <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
              <input
                type="text"
                value={homeQuery}
                onChange={e => setHomeQuery(e.target.value)}
                placeholder="Search artists by name, title..."
                className="form-input pl-12 w-full !bg-black/40 !border-white/20 focus:!border-gold rounded-none"
              />
            </div>
            <div className="flex gap-2">
              {[
                { id: 'all', label: 'ALL' },
                { id: 'group', label: 'GROUP' },
                { id: 'solo', label: 'ARIST' }, // exact spelling per user's design
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setHomeFilter(f.id)}
                  className={`px-5 md:px-7 py-3 text-sm md:text-base uppercase tracking-widest font-semibold transition-colors border-2 flex-shrink-0 ${
                    homeFilter === f.id
                      ? 'bg-gold text-dark border-gold'
                      : 'bg-transparent text-white border-white/40 hover:border-gold hover:text-gold'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Artists — DESKTOP (md+) carousel with arrow + dot pagination; MOBILE (< md) swipe rows */}
          {loading ? (
            <>
              <div className="hidden md:flex gap-5 overflow-hidden">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex-shrink-0 aspect-[3/4] rounded-t-[18px] rounded-b-[14px] bg-white/10 animate-pulse" style={{ flexBasis: 'calc((100% - 4 * 1.25rem) / 5)' }} />
                ))}
              </div>
              <div className="md:hidden flex gap-3 overflow-x-hidden -mx-4 px-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex-shrink-0 aspect-[3/4] rounded-t-[18px] rounded-b-[14px] bg-white/10 animate-pulse" style={{ width: '44vw' }} />
                ))}
              </div>
            </>
          ) : homeFiltered.length === 0 ? (
            <div className="border border-white/10 p-12 text-center">
              <p className="text-white/40 font-display text-lg sm:text-xl uppercase tracking-widest">
                No artists found
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* ======= DESKTOP (md+): horizontal carousel with arrows + dots ======= */}
              <div className="hidden md:block">
                {homeFilter === 'all' ? (() => {
                  // On "ALL" split into Groups row + Artists row (same as /artists)
                  const deskGroups = homeFiltered.filter(a => a.isGroup);
                  const deskIndividuals = homeFiltered.filter(a => !a.isGroup);
                  return (
                    <div className="space-y-10 md:space-y-14">
                      {deskGroups.length > 0 && (
                        <section>
                          <div className="flex items-baseline gap-3 mb-5 md:mb-6">
                            <h3 className="font-display text-2xl md:text-3xl text-white uppercase leading-none">Groups</h3>
                            <span className="text-white/40 text-base">({deskGroups.length})</span>
                          </div>
                          <DesktopCarousel>
                            {deskGroups.map(g => (
                              <div key={g._id}>
                                <TalentCard artist={g} onClick={() => setSelected(g)} />
                              </div>
                            ))}
                          </DesktopCarousel>
                        </section>
                      )}
                      {deskIndividuals.length > 0 && (
                        <section>
                          <div className="flex items-baseline gap-3 mb-5 md:mb-6">
                            <h3 className="font-display text-2xl md:text-3xl text-white uppercase leading-none">Artists</h3>
                            <span className="text-white/40 text-base">({deskIndividuals.length})</span>
                          </div>
                          <DesktopCarousel>
                            {deskIndividuals.map(a => {
                              const g = a.groupId ? groups.find(gr => String(gr._id) === String(a.groupId)) : null;
                              return (
                                <div key={a._id}>
                                  <TalentCard artist={a} onClick={() => setSelected(a)} />
                                  {g && (
                                    <p className="text-[10px] sm:text-xs text-gold/60 text-center px-1 truncate mt-1.5">
                                      of <span className="text-gold/90 font-semibold">{g.name}</span>
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </DesktopCarousel>
                        </section>
                      )}
                    </div>
                  );
                })() : (
                  <DesktopCarousel>
                    {homeFiltered.map(a => {
                      const g = a.groupId ? groups.find(gr => String(gr._id) === String(a.groupId)) : null;
                      return (
                        <div key={a._id}>
                          <TalentCard artist={a} onClick={() => setSelected(a)} />
                          {!a.isGroup && g && (
                            <p className="text-[10px] sm:text-xs text-gold/60 text-center px-1 truncate mt-1.5">
                              of <span className="text-gold/90 font-semibold">{g.name}</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </DesktopCarousel>
                )}
              </div>

              {/* ======= MOBILE (< md): horizontal swipe carousel ======= */}
              <div className="md:hidden">
                {homeFilter === 'all' ? (() => {
                  const mobileGroups = homeFiltered.filter(a => a.isGroup);
                  const mobileIndividuals = homeFiltered.filter(a => !a.isGroup);
                  return (
                    <div className="space-y-8">
                      {mobileGroups.length > 0 && (
                        <section>
                          <div className="flex items-baseline gap-2 mb-4 px-1">
                            <h3 className="font-display text-xl text-white uppercase leading-none">Groups</h3>
                            <span className="text-white/40 text-sm">({mobileGroups.length})</span>
                          </div>
                          <MobileSwipeRow>
                            {mobileGroups.map(g => (
                              <div key={g._id} className="snap-start flex-shrink-0" style={{ width: '44vw' }}>
                                <TalentCard artist={g} onClick={() => setSelected(g)} />
                              </div>
                            ))}
                          </MobileSwipeRow>
                        </section>
                      )}
                      {mobileIndividuals.length > 0 && (
                        <section>
                          <div className="flex items-baseline gap-2 mb-4 px-1">
                            <h3 className="font-display text-xl text-white uppercase leading-none">Artists</h3>
                            <span className="text-white/40 text-sm">({mobileIndividuals.length})</span>
                          </div>
                          <MobileSwipeRow>
                            {mobileIndividuals.map(a => {
                              const g = a.groupId ? groups.find(gr => String(gr._id) === String(a.groupId)) : null;
                              return (
                                <div key={a._id} className="snap-start flex-shrink-0" style={{ width: '44vw' }}>
                                  <TalentCard artist={a} onClick={() => setSelected(a)} />
                                  {g && (
                                    <p className="text-[10px] text-gold/60 text-center px-1 truncate mt-1.5">
                                      of <span className="text-gold/90 font-semibold">{g.name}</span>
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </MobileSwipeRow>
                        </section>
                      )}
                    </div>
                  );
                })() : (
                  <MobileSwipeRow>
                    {homeFiltered.map(a => {
                      const g = a.groupId ? groups.find(gr => String(gr._id) === String(a.groupId)) : null;
                      return (
                        <div key={a._id} className="snap-start flex-shrink-0" style={{ width: '44vw' }}>
                          <TalentCard artist={a} onClick={() => setSelected(a)} />
                          {g && (
                            <p className="text-[10px] text-gold/60 text-center px-1 truncate mt-1.5">
                              of <span className="text-gold/90 font-semibold">{g.name}</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </MobileSwipeRow>
                )}
              </div>

              {/* "See all" link under grid */}
              {artists.length > 10 && (
                <div className="text-center mt-10 md:mt-12">
                  <Link href="/artists" className="btn-outline">
                    See All Artists →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ========================================== */}
      {/* MUSIC CTA — "Hear the Music" cinematic section */}
      {/* ========================================== */}
      <section
        className="relative w-full overflow-hidden flex items-center justify-center"
        style={{ minHeight: 'clamp(280px, 48vw, 480px)' }}
      >
        {/* Background image (bronze grunge + music notes) */}
        <img
          src="/uploads/images/home/music-cta-bg.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover select-none"
         loading="lazy" decoding="async" />
        {/* Subtle darkening overlay to ensure text legibility (kept light so bronze BG shows) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(10,8,6,0.05) 0%, rgba(10,8,6,0.15) 50%, rgba(10,8,6,0.35) 100%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-10 md:py-14">
          {/* "TUNE IN" — small gold eyebrow */}
          <p
            className="font-display text-gold uppercase tracking-[0.4em] mb-4 md:mb-6"
            style={{ fontSize: 'clamp(11px, 1.6vw, 18px)' }}
          >
            Tune In
          </p>

          {/* Headline row: HEAR + vertical THE + Music (script) */}
          <div className="flex items-stretch justify-center gap-1 sm:gap-1.5 md:gap-2 leading-none select-none">
            {/* HEAR — huge bold white */}
            <h2
              className="font-display font-black uppercase text-white tracking-tight self-center"
              style={{ fontSize: 'clamp(56px, 14vw, 190px)', lineHeight: 0.85 }}
            >
              Hear
            </h2>

            {/* THE — stacked vertically, sized to ~35% of HEAR height, tucked tightly between */}
            <span
              className="font-display font-bold uppercase text-white/95 flex flex-col items-center justify-center"
              style={{
                fontSize: 'clamp(15px, 3.1vw, 42px)',
                lineHeight: 0.95,
                letterSpacing: '0.08em',
                gap: '0.05em',
                paddingTop: '0.15em',
                paddingBottom: '0.35em',
              }}
            >
              <span>T</span>
              <span>H</span>
              <span>E</span>
            </span>

            {/* Music — elegant gold script */}
            <span
              className="text-gold italic self-end"
              style={{
                fontFamily: '"Pinyon Script", "Great Vibes", cursive',
                fontSize: 'clamp(68px, 18vw, 260px)',
                lineHeight: 0.75,
                textShadow: '0 4px 20px rgba(0,0,0,0.35)',
                marginLeft: '-0.02em',
                marginBottom: '-0.04em',
              }}
            >
              Music
            </span>
          </div>

          {/* Subtitle */}
          <p
            className="text-white/85 uppercase tracking-[0.3em] mt-5 md:mt-8 font-medium"
            style={{ fontSize: 'clamp(9px, 1.6vw, 15px)' }}
          >
            Stream and Download Music From Our Roster
          </p>

          {/* LISTEN NOW button — solid gold flat rectangle, dark text */}
          <Link
            href="/music"
            className="mt-7 md:mt-10 inline-flex items-center justify-center font-display uppercase tracking-[0.2em] text-dark bg-gold hover:bg-[#d9b85c] active:scale-95 transition-colors duration-200"
            style={{
              padding: '0.85em 2.2em',
              fontSize: 'clamp(11px, 1.8vw, 15px)',
              letterSpacing: '0.25em',
              borderRadius: 0,
              border: 'none',
              minWidth: 'clamp(150px, 18vw, 220px)',
            }}
          >
            Listen Now
          </Link>
        </div>
      </section>

      {/* CONTACT CTA — full-width gold hand background filling the section + larger sign-in panel */}
      <section className="relative bg-dark pt-6 pb-8 md:pt-8 md:pb-10 px-3 sm:px-6">
        {/* Outer gold border layer spans full width */}
        <div
          className="relative w-full overflow-hidden p-[1.5px]"
          style={{
            background: 'linear-gradient(135deg, rgba(201,168,76,0.55) 0%, rgba(201,168,76,0.15) 50%, rgba(201,168,76,0.55) 100%)',
            borderRadius: '32px 8px 32px 8px',
            boxShadow: '0 0 22px rgba(201,168,76,0.12)',
          }}
        >
          <div
            className="relative w-full overflow-hidden"
            style={{ borderRadius: '31px 7px 31px 7px', minHeight: '260px' }}
          >
            {/* Background fills entire section */}
            <img
              src="/uploads/images/home/contact-hand-bg.webp"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover"
             loading="lazy" decoding="async" />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(135deg, rgba(60,40,10,0.72) 0%, rgba(90,65,20,0.55) 50%, rgba(60,40,10,0.78) 100%)',
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ boxShadow: 'inset 0 0 70px rgba(0,0,0,0.5)' }}
            />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 md:p-8 lg:p-9">

              {/* LEFT — contact info */}
              <div className="lg:col-span-7 flex flex-col justify-center text-white text-center md:text-left">
                <p className="text-white/85 uppercase tracking-[0.22em] mb-1" style={{ fontSize: 'clamp(11px, 3vw, 13px)' }}>
                  Get in Touch
                </p>
                <h2
                  className="font-display font-bold uppercase text-white leading-none mb-2 mx-auto md:mx-0"
                  style={{ fontSize: 'clamp(32px, 8vw, 48px)', letterSpacing: '0.01em' }}
                >
                  Contact Us
                </h2>
                <p className="text-white/75 mb-3 md:mb-4 max-w-lg mx-auto md:mx-0" style={{ fontSize: 'clamp(12px, 3.2vw, 14px)' }}>
                  Sign in with Google required to send messages (prevents spam)
                </p>

                <div className="inline-flex items-center gap-2 bg-white text-dark font-bold uppercase tracking-wider px-4 py-1 rounded-full mb-3 mx-auto md:mx-0 md:self-start" style={{ fontSize: 'clamp(11px, 3vw, 13px)' }}>
                  Direct Email
                </div>

                <div className="space-y-1 mb-3 md:mb-4">
                  <a
                    href="mailto:info@dle-entertainment.com"
                    className="block text-white hover:text-gold transition-colors font-light break-all" style={{ fontSize: 'clamp(15px, 4vw, 22px)' }}
                  >
                    info@dle-entertainment.com
                  </a>
                  <span
                    className="block text-white/80 font-light" style={{ fontSize: 'clamp(14px, 3.8vw, 20px)' }}
                  >
                    dle-entertainment.com
                  </span>
                </div>

                <div className="text-white/80 leading-snug max-w-lg mx-auto md:mx-0 space-y-1" style={{ fontSize: 'clamp(13px, 3.2vw, 15px)' }}>
                  <p>For business inquiries, artist submissions, or fan support — sign in and send us a message, or email us directly.</p>
                  <p>For urgent donation/refund issues, include your PayMongo reference number.</p>
                </div>
              </div>

              {/* RIGHT — Sign-in panel OR "Send a Message" panel when signed in */}
              <div className="lg:col-span-5 flex items-stretch justify-center lg:justify-end">
                <div
                  className="w-full max-w-[360px] bg-black/90 text-center p-6 md:p-7 lg:p-8 flex flex-col items-center justify-center"
                  style={{
                    borderRadius: '26px',
                    border: '1.5px solid rgba(201,168,76,0.45)',
                    boxShadow: '0 14px 40px rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(6px)',
                    minHeight: '250px',
                  }}
                >
                  {isSignedIn ? (
                    /* ======== SIGNED-IN VIEW ======== */
                    <>
                      <div
                        className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center mb-3 flex-shrink-0"
                        style={{ background: 'var(--gold-dim)', border: '2px solid var(--gold)' }}
                      >
                        {session.user.image ? (
                          <img src={session.user.image} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="gold-text font-display text-xl">
                            {(session.user.name || session.user.email || 'U')[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <h3 className="font-display font-bold uppercase text-white text-lg md:text-xl mb-1 leading-tight">
                        Welcome back
                      </h3>
                      <p className="text-gold text-xs md:text-sm font-semibold mb-1 truncate max-w-full px-2">
                        {session.user.name || session.user.email?.split('@')[0]}
                      </p>
                      <p className="text-white/75 text-xs md:text-sm leading-relaxed mb-5">
                        You're signed in. Send us a message about bookings, artist submissions, partnerships, or anything else.
                      </p>
                      <Link
                        href="/contact"
                        className="w-full flex items-center justify-center gap-2.5 font-semibold px-5 py-2.5 md:py-3 rounded-md text-sm md:text-base transition-all hover:brightness-110 hover:shadow-[0_0_20px_rgba(201,168,76,0.4)] text-dark bg-gold"
                      >
                        <Mail size={17} />
                        Go to Contact Page
                      </Link>
                      <p className="text-white/50 text-[10px] md:text-[11px] mt-3 leading-relaxed">
                        Or email us directly at{' '}
                        <a href="mailto:info@dle-entertainment.com" className="text-gold/80 hover:text-gold underline">info@dle-entertainment.com</a>
                      </p>
                    </>
                  ) : (
                    /* ======== SIGNED-OUT VIEW ======== */
                    <>
                      <img
                        src="/uploads/images/home/lock-icon.webp"
                        alt=""
                        aria-hidden="true"
                        className="w-11 h-11 md:w-12 md:h-12 mb-3 opacity-95"
                        style={{ filter: 'brightness(0) invert(1)' }}
                       loading="lazy" decoding="async" />
                      <h3 className="font-display font-bold uppercase text-white text-xl md:text-2xl mb-3 leading-tight">
                        Sign in Required
                      </h3>
                      <p className="text-white/75 text-xs md:text-sm leading-relaxed mb-5">
                        To prevent spam, please sign in with Google before sending a message. We never post anything to your account.
                      </p>
                      <Link
                        href="/login?callbackUrl=/contact"
                        className="w-full flex items-center justify-center gap-2.5 font-semibold px-5 py-2.5 md:py-3 rounded-md text-sm md:text-base transition-all hover:brightness-110 hover:shadow-[0_0_20px_rgba(201,168,76,0.4)]"
                        style={{ background: 'linear-gradient(180deg, #8A7530 0%, #5C4B1F 100%)', color: '#fff' }}
                      >
                        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white" aria-hidden="true">
                          <svg viewBox="0 0 24 24" width="15" height="15">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        </span>
                        Sign in with Google
                      </Link>
                      <p className="text-white/50 text-[10px] md:text-[11px] mt-3 leading-relaxed">
                        Don't want to sign in? Email us directly at{' '}
                        <a href="mailto:info@dle-entertainment.com" className="text-gold/80 hover:text-gold underline">info@dle-entertainment.com</a>
                      </p>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {selected && <VideoModal artist={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <HomeContent />
    </Suspense>
  )
}
