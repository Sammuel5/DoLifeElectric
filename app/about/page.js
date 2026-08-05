'use client'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'

export default function AboutPage() {
  const videoRef = useRef(null)
  const [videoReady, setVideoReady] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)

  // Respect reduced motion & small screens — skip video on mobile & low-motion preference
  const [shouldPlayVideo, setShouldPlayVideo] = useState(false)

  useEffect(() => {
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
    const saveData = typeof navigator !== 'undefined' && navigator.connection?.saveData
    setShouldPlayVideo(!reducedMotion && !isMobile && !saveData)
  }, [])

  useEffect(() => {
    const v = videoRef.current
    if (!v || !shouldPlayVideo) return
    // Load source dynamically so we don't even request the MP4 on mobile
    v.src = '/uploads/videos/about-bg.mp4'
    v.load()
  }, [shouldPlayVideo])

  const bgImg = '/uploads/images/about-bg.jpg'

  return (
    <div className="min-h-screen">
      {/* HERO with background video / image */}
      <section className="relative h-[100svh] min-h-[560px] w-full overflow-hidden flex items-center justify-center pt-20 sm:pt-16 pb-8 sm:pb-0">
        {/* Layer 1: Base black */}
        <div className="absolute inset-0 bg-black" />

        {/* Layer 2: Poster image (always visible on mobile; bottom layer on desktop too) */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bgImg})` }}
          aria-hidden="true"
        />

        {/* Layer 3: Video (desktop only; fades in when loaded) */}
        {shouldPlayVideo && (
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoReady && !videoFailed ? 'opacity-100' : 'opacity-0'}`}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            onCanPlay={() => setVideoReady(true)}
            onError={() => setVideoFailed(true)}
            aria-hidden="true"
          />
        )}

        {/* Layer 4: Dark gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/90" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 sm:from-black/30 sm:to-black/30" aria-hidden="true" />
        <div
          className="absolute inset-0 opacity-30"
          style={{ backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(201,168,76,0.35) 0%, transparent 55%)' }}
          aria-hidden="true"
        />

        {/* Layer 5: Content */}
        <div className="relative z-10 w-full px-4 sm:px-6 text-center max-w-4xl mx-auto animate-slide-up">
          <p className="text-gold text-[10px] sm:text-xs uppercase tracking-[0.4em] sm:tracking-[0.5em] mb-3 sm:mb-4">Our Story</p>
          <h1 className="font-display font-bold text-white text-5xl sm:text-7xl md:text-8xl lg:text-9xl uppercase leading-[0.9] tracking-tight drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
            About<br className="sm:hidden" />
            <span className="gold-text">DLE</span>
          </h1>
          <p className="text-white/85 text-base sm:text-lg md:text-xl mt-5 sm:mt-7 max-w-2xl mx-auto leading-relaxed px-1 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            Do Life Electric — elite infrastructure for artists who refuse to dim their light.
          </p>
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 justify-center max-w-xs sm:max-w-none mx-auto">
            <a href="#story" className="btn-gold w-full sm:w-auto min-h-[44px] flex items-center justify-center">Our Story</a>
            <Link href="/artists" className="btn-outline w-full sm:w-auto min-h-[44px] flex items-center justify-center">Meet the Artists</Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <a href="#story" className="absolute bottom-5 sm:bottom-8 left-1/2 -translate-x-1/2 text-white/50 hover:text-gold z-10 p-2">
          <ChevronDown size={26} className="sm:size-7 animate-bounce" />
        </a>
      </section>

      {/* STORY CONTENT */}
      <section id="story" className="relative bg-dark py-16 sm:py-24 px-4 sm:px-6">
        {/* Subtle top gold fade */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" aria-hidden="true" />
        <div className="max-w-3xl mx-auto space-y-7 sm:space-y-8 text-white/70 leading-relaxed text-sm sm:text-base">
          <p className="text-lg sm:text-2xl text-white/90 font-display uppercase tracking-wide leading-snug">
            DLE — <span className="gold-text">Do Life Electric</span> — is an elite entertainment company providing infrastructure for artists who choose to light up the world.
          </p>
          <p>
            We build platforms, create opportunities, and power the careers of tomorrow's most compelling talents. From vocal powerhouses to master producers, DLE is the home for artists who refuse to dim their light.
          </p>
          <p>
            Our fan support platform allows supporters worldwide to send gifts, food, clothing, and direct financial support to their favorite artists — securely, transparently, and with 100% of funds routed through DLE's official PayMongo accounts before being distributed to artists according to their contracts.
          </p>
          <p className="text-white/60">
            Every play. Every download. Every gift. Every show. We turn voltage into velocity for the artists who carry the current.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-10 border-t border-white/10 mt-10">
            <div className="bg-dark-card border border-white/10 p-5 sm:p-6 text-center sm:text-left">
              <div className="font-display text-4xl sm:text-5xl gold-text">100%</div>
              <p className="text-white/60 text-xs sm:text-sm mt-2 leading-snug">Secure payments via PayMongo, BSP-licensed</p>
            </div>
            <div className="bg-dark-card border border-white/10 p-5 sm:p-6 text-center sm:text-left">
              <div className="font-display text-4xl sm:text-5xl gold-text">24/7</div>
              <p className="text-white/60 text-xs sm:text-sm mt-2 leading-snug">Artist support &amp; fan engagement</p>
            </div>
            <div className="bg-dark-card border border-white/10 p-5 sm:p-6 text-center sm:text-left">
              <div className="font-display text-4xl sm:text-5xl gold-text">Global</div>
              <p className="text-white/60 text-xs sm:text-sm mt-2 leading-snug">Fan community from anywhere in the world</p>
            </div>
          </div>

          <div className="text-center pt-6 sm:pt-8">
            <Link href="/artists" className="btn-gold inline-flex items-center justify-center min-h-[44px] px-8">
              Explore the Roster →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
