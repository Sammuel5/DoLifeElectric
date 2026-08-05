'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import ArtistCard from '@/components/ArtistCard'
import VideoModal from '@/components/VideoModal'
import toast from 'react-hot-toast'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function HomeContent() {
  const [artists, setArtists] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()

  useEffect(() => {
    fetch('/api/artists').then(r => r.json()).then(data => {
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

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-dark via-dark to-dark-light" />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, #C9A84C 0%, transparent 60%)'
        }} />
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto animate-slide-up pt-16 pb-8 safe-pt">
          <img
            src="/dlelogo/dle-logo.png"
            alt="DLE Entertainment"
            className="mx-auto w-[240px] xs:w-[280px] sm:w-[380px] md:w-[500px] lg:w-[600px] max-w-[75vw] h-auto mb-5 md:mb-8 drop-shadow-[0_0_40px_rgba(201,168,76,0.25)]"
          />
          <p className="text-gold text-[10px] sm:text-xs md:text-sm uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-3 sm:mb-4">Do Life Electric</p>
          <h1 className="font-display font-bold text-white text-3xl sm:text-5xl md:text-6xl lg:text-7xl leading-none tracking-tight uppercase">
            Redefining<br className="sm:hidden" />
            <span className="gold-text">the Vision</span>
          </h1>
          <p className="text-white/60 text-sm md:text-lg mt-5 md:mt-8 max-w-2xl mx-auto leading-relaxed px-2">
            Elite infrastructure for artists who choose to Do Life Electric.
          </p>
          <div className="mt-7 md:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-xs sm:max-w-none mx-auto">
            <a href="#talents" className="btn-gold w-full sm:w-auto">Explore the Roster</a>
            <Link href="/about" className="btn-outline w-full sm:w-auto">Our Story</Link>
          </div>
        </div>
        <a href="#talents" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 hover:text-gold animate-bounce">
          <ChevronDown size={28} />
        </a>
      </section>

      {/* TALENTS */}
      <section id="talents" className="py-16 md:py-20 px-3 sm:px-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 md:mb-10 gap-4">
          <div>
            <p className="text-gold text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-2 sm:mb-3">Featured</p>
            <h2 className="font-display font-bold text-white text-3xl md:text-5xl uppercase leading-none">
              Our <span className="gold-text">Talents</span>
            </h2>
            <p className="text-white/50 mt-3 max-w-xl text-xs sm:text-sm">Click any artist or member name to watch their video and send support.</p>
          </div>
          <Link href="/artists" className="btn-outline text-xs self-start sm:self-end whitespace-nowrap">
            See All Artists →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="aspect-[3/4] bg-dark-card animate-pulse" />)}
          </div>
        ) : artists.length === 0 ? (
          <div className="border border-white/10 p-12 text-center">
            <p className="text-white/40 font-display text-lg sm:text-xl uppercase tracking-widest">No artists yet — add them in admin</p>
          </div>
        ) : (
          <div className="space-y-8 md:space-y-12">
            {/* Group members on homepage — shown as clickable tags for quick access */}
            {visibleGroups.length > 0 && (
              <div>
                <h3 className="font-display text-lg sm:text-xl text-white uppercase mb-4 flex items-center gap-3">
                  <span className="w-6 sm:w-8 h-px bg-gold" /> Groups
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                  {visibleGroups.map(g => {
                    const members = getMembers(g._id)
                    return (
                      <div key={g._id} className="space-y-2">
                        <ArtistCard artist={g} onClick={() => setSelected(g)} />
                        {members.length > 0 && (
                          <div className="px-1 space-y-1">
                            <div className="flex flex-wrap gap-1">
                              {members.slice(0, 4).map(m => (
                                <button key={m._id} onClick={() => setSelected(m)}
                                  className="text-[10px] sm:text-xs text-gold/80 hover:text-gold bg-gold/10 hover:bg-gold/20 px-2 py-1 transition-colors truncate">
                                  {m.name}
                                </button>
                              ))}
                              {members.length > 4 && (
                                <Link href="/artists" className="text-[10px] text-white/50 hover:text-gold px-1 py-1">
                                  +{members.length - 4}
                                </Link>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Individual artists (solo + group members) */}
            {visibleIndividuals.length > 0 && (
              <div>
                {visibleGroups.length > 0 && (
                  <h3 className="font-display text-lg sm:text-xl text-white uppercase mb-4 flex items-center gap-3">
                    <span className="w-6 sm:w-8 h-px bg-gold" /> Artists
                  </h3>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                  {visibleIndividuals.map(a => {
                    const group = parentGroup(a)
                    return (
                      <div key={a._id} className="space-y-1.5">
                        <ArtistCard artist={a} onClick={() => setSelected(a)} />
                        {group && (
                          <p className="text-[10px] sm:text-xs text-gold/60 text-center px-1 truncate">
                            of <span className="text-gold/90 font-semibold">{group.name}</span>
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {hasMore && (
              <div className="text-center pt-4">
                <Link href="/artists" className="btn-gold inline-block">
                  See All {artists.length} Artists →
                </Link>
              </div>
            )}
          </div>
        )}
      </section>

      {/* MUSIC CTA */}
      <section className="py-16 md:py-20 px-4 sm:px-6 bg-dark-light">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-gold text-xs uppercase tracking-[0.4em] mb-3">Now Playing</p>
          <h2 className="font-display font-bold text-white text-4xl md:text-6xl uppercase leading-none mb-6">
            Hear the <span className="gold-text">Music</span>
          </h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto text-sm">Stream and download music from our roster.</p>
          <Link href="/music" className="btn-gold">Listen Now</Link>
        </div>
      </section>

      {/* CONTACT CTA */}
      <section className="py-16 md:py-20 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        <p className="text-gold text-xs uppercase tracking-[0.4em] mb-3">Work With Us</p>
        <h2 className="font-display font-bold text-white text-4xl md:text-6xl uppercase leading-none mb-6">
          Have a <span className="gold-text">Project?</span>
        </h2>
        <Link href="/contact" className="btn-gold">Contact Us</Link>
      </section>

      {selected && <VideoModal artist={selected} onClose={() => setSelected(null)} />}
    </>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <HomeContent />
    </Suspense>
  )
}
