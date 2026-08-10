'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import VideoModal from '@/components/VideoModal'

/*
 * TalentCard — same cinematic card used on the homepage Our Talents section.
 */
function TalentCard({ artist, onClick, featured }) {
  return (
    <div
      className="relative overflow-hidden cursor-pointer group rounded-t-[18px] rounded-b-[14px] transition-transform duration-300 hover:scale-[1.03] active:scale-95"
      onClick={onClick}
      style={{ aspectRatio: '3/4', minWidth: 0 }}
    >
      {artist.image ? (
        <img
          src={artist.image}
          alt={artist.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1610] to-[#0A0806] text-white/30 font-display text-5xl">
          {artist.name?.[0] || '?'}
        </div>
      )}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 50%, rgba(90,74,34,0.85) 78%, rgba(60,48,18,0.95) 100%)',
        }}
      />
      <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 flex flex-col justify-end pointer-events-none">
        <h3
          className="font-display text-white uppercase leading-[1.0] tracking-wide"
          style={{
            fontSize: featured ? 'clamp(1.25rem, 2.2vw, 2rem)' : 'clamp(1rem, 2.5vw, 1.5rem)',
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
          <span className="mt-1.5 self-end text-white/90 text-xs md:text-sm font-display uppercase tracking-wider">
            Group
          </span>
        )}
      </div>
    </div>
  )
}

/*
 * Horizontal scroll carousel (mobile swipe row)
 * - scroll-snap, touch-momentum, hidden scrollbar
 * - optional left/right arrow buttons (desktop)
 */
function SwipeRow({ children }) {
  const scrollRef = useRef(null)

  const scroll = (dir) => {
    const el = scrollRef.current
    if (!el) return
    const amount = el.clientWidth * 0.8 * dir
    el.scrollBy({ left: amount, behavior: 'smooth' })
  }

  return (
    <div className="relative group/row">
      {/* Left / right arrow buttons — show on md+ (on mobile the user swipes) */}
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="Scroll left"
        className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-black/70 hover:bg-gold text-white hover:text-dark backdrop-blur-sm transition opacity-0 group-hover/row:opacity-100"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label="Scroll right"
        className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-black/70 hover:bg-gold text-white hover:text-dark backdrop-blur-sm transition opacity-0 group-hover/row:opacity-100"
      >
        <ChevronRight size={20} />
      </button>

      <div
        ref={scrollRef}
        className="flex gap-3 md:gap-5 overflow-x-auto snap-x snap-mandatory pb-3 -mx-3 px-3 md:mx-0 md:px-0 no-scrollbar"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollPaddingLeft: '1rem',
          scrollPaddingRight: '1rem',
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default function ArtistsPage() {
  const [artists, setArtists] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'group' | 'solo'

  useEffect(() => {
    fetch('/api/artists')
      .then(r => r.json())
      .then(data => { setArtists(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // PayMongo return toast + auto-open artist
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const giftStatus = url.searchParams.get('gift')
    const artistId = url.searchParams.get('artistId')
    const artistName = url.searchParams.get('artist')

    if (giftStatus === 'success') {
      const name = artistName ? decodeURIComponent(artistName) : 'the artist'
      toast.success(`🎁 Thank you! Your gift to ${name} was sent successfully.`, { duration: 6000 })
    } else if (giftStatus === 'cancelled') {
      toast('Gift cancelled — no payment was taken.', { icon: 'ℹ️' })
    }

    if ((giftStatus === 'success' || giftStatus === 'cancelled') && artistId) {
      const tryOpen = () => {
        const found = artists.find(a => String(a._id) === String(artistId))
        if (found) {
          setSelected(found)
          window.history.replaceState({}, '', '/artists')
        }
      }
      if (artists.length) tryOpen()
      else {
        const t = setInterval(() => { if (artists.length) { tryOpen(); clearInterval(t) } }, 200)
        setTimeout(() => clearInterval(t), 8000)
      }
    }
  }, [artists])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return artists.filter(a => {
      if (filter === 'solo' && a.isGroup) return false
      if (filter === 'group' && !a.isGroup) return false
      if (!q) return true
      return (
        a.name?.toLowerCase().includes(q) ||
        a.title?.toLowerCase().includes(q) ||
        a.bio?.toLowerCase().includes(q)
      )
    })
  }, [artists, query, filter])

  const groups = filtered.filter(a => a.isGroup)
  const individuals = filtered.filter(a => !a.isGroup) // solo + group members
  const everyone = filtered // everything

  const getMembers = (groupId) => artists.filter(a => a.groupId && String(a.groupId) === String(groupId))
  const parentGroup = (artist) => {
    if (!artist.groupId) return null
    return artists.find(g => g.isGroup && String(g._id) === String(artist.groupId)) || null
  }

  return (
    <div
      className="relative w-full overflow-hidden py-12 md:py-20 px-0"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.10) 0%, rgba(0,0,0,0) 45%), #0A0806',
      }}
    >
      {/* DLE watermark */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 opacity-[0.05] z-0" aria-hidden="true">
        <img src="/dlelogo/dle-logo-sm.png" alt="" className="w-[700px] max-w-none select-none" />
      </div>
      {/* Noise */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay z-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Heading */}
        <div className="text-center mb-8 md:mb-12">
          <h2
            className="font-display font-bold uppercase tracking-[0.03em] leading-none gold-text"
            style={{ fontSize: 'clamp(42px, 12vw, 120px)' }}
          >
            Our Talents
          </h2>
          <p className="text-white/85 max-w-4xl mx-auto mt-3 md:mt-4 leading-relaxed font-medium" style={{ fontSize: 'clamp(13px, 3.2vw, 17px)' }}>
            Browse all groups and artists. Tap or click any card to watch their video and send gifts.
          </p>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-10 md:mb-12 max-w-6xl mx-auto">
          <div className="relative flex-1">
            <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search artists by name, title..."
              className="form-input pl-12 w-full !bg-black/40 !border-white/20 focus:!border-gold rounded-none"
            />
          </div>
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'ALL' },
              { id: 'group', label: 'GROUP' },
              { id: 'solo', label: 'ARIST' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-5 md:px-7 py-3 text-sm md:text-base uppercase tracking-widest font-semibold transition-colors border-2 flex-shrink-0 ${
                  filter === f.id
                    ? 'bg-gold text-dark border-gold'
                    : 'bg-transparent text-white border-white/40 hover:border-gold hover:text-gold'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="hidden md:grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {[1,2,3,4,5].map(i => <div key={i} className="aspect-[3/4] rounded-t-[18px] rounded-b-[14px] bg-white/10 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-white/10 p-12 text-center">
            <p className="text-white/40 font-display text-lg sm:text-xl uppercase tracking-widest">
              No artists found
            </p>
            {query && (
              <button onClick={() => setQuery('')} className="mt-3 text-gold text-sm hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-10 md:space-y-14">
            {/* ======= DESKTOP (md+): grid layout ======= */}
            <div className="hidden md:block">
              {filter === 'all' ? (
                <>
                  {groups.length > 0 && (
                    <section className="mb-10 md:mb-14">
                      <div className="flex items-baseline gap-3 mb-5 md:mb-6">
                        <h3 className="font-display text-2xl md:text-3xl text-white uppercase leading-none">Groups</h3>
                        <span className="text-white/40 text-base">({groups.length})</span>
                      </div>
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 items-end">
                        {groups.map((g, idx) => (
                          <div key={g._id}>
                            <TalentCard artist={g} onClick={() => setSelected(g)} />
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                  {individuals.length > 0 && (
                    <section>
                      <div className="flex items-baseline gap-3 mb-5 md:mb-6">
                        <h3 className="font-display text-2xl md:text-3xl text-white uppercase leading-none">Artists</h3>
                        <span className="text-white/40 text-base">({individuals.length})</span>
                      </div>
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 items-end">
                        {individuals.map((a, idx) => {
                          const g = parentGroup(a)
                          const isCenter = idx === 2
                          return (
                            <div key={a._id} className={`transition-transform duration-300 ${isCenter ? 'lg:scale-110 lg:-my-4 z-10' : ''}`}>
                              <TalentCard artist={a} onClick={() => setSelected(a)} featured={isCenter} />
                              {g && (
                                <p className="text-[10px] sm:text-xs text-gold/60 text-center px-1 truncate mt-1.5">
                                  of <span className="text-gold/90 font-semibold">{g.name}</span>
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 items-end">
                  {filtered.map((a, idx) => {
                    const g = parentGroup(a)
                    const isCenter = idx === 2
                    return (
                      <div key={a._id} className={`transition-transform duration-300 ${isCenter && filter === 'all' ? 'lg:scale-110 lg:-my-4 z-10' : ''}`}>
                        <TalentCard artist={a} onClick={() => setSelected(a)} featured={isCenter} />
                        {!a.isGroup && g && (
                          <p className="text-[10px] sm:text-xs text-gold/60 text-center px-1 truncate mt-1.5">
                            of <span className="text-gold/90 font-semibold">{g.name}</span>
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ======= MOBILE (< md): swipeable horizontal carousel ======= */}
            <div className="md:hidden">
              {filter === 'all' ? (
                <>
                  {/* Groups swipe row */}
                  {groups.length > 0 && (
                    <section className="mb-8">
                      <div className="flex items-baseline gap-2 mb-4 px-1">
                        <h3 className="font-display text-xl text-white uppercase leading-none">Groups</h3>
                        <span className="text-white/40 text-sm">({groups.length})</span>
                      </div>
                      <SwipeRow>
                        {groups.map(g => (
                          <div key={g._id} className="snap-start flex-shrink-0" style={{ width: '44vw' }}>
                            <TalentCard artist={g} onClick={() => setSelected(g)} />
                          </div>
                        ))}
                      </SwipeRow>
                    </section>
                  )}
                  {/* Artists swipe row */}
                  {individuals.length > 0 && (
                    <section>
                      <div className="flex items-baseline gap-2 mb-4 px-1">
                        <h3 className="font-display text-xl text-white uppercase leading-none">Artists</h3>
                        <span className="text-white/40 text-sm">({individuals.length})</span>
                      </div>
                      <SwipeRow>
                        {individuals.map(a => {
                          const g = parentGroup(a)
                          return (
                            <div key={a._id} className="snap-start flex-shrink-0" style={{ width: '44vw' }}>
                              <TalentCard artist={a} onClick={() => setSelected(a)} />
                              {g && (
                                <p className="text-[10px] text-gold/60 text-center px-1 truncate mt-1.5">
                                  of <span className="text-gold/90 font-semibold">{g.name}</span>
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </SwipeRow>
                    </section>
                  )}
                </>
              ) : (
                <SwipeRow>
                  {filtered.map(a => {
                    const g = parentGroup(a)
                    return (
                      <div key={a._id} className="snap-start flex-shrink-0" style={{ width: '44vw' }}>
                        <TalentCard artist={a} onClick={() => setSelected(a)} />
                        {!a.isGroup && g && (
                          <p className="text-[10px] text-gold/60 text-center px-1 truncate mt-1.5">
                            of <span className="text-gold/90 font-semibold">{g.name}</span>
                          </p>
                        )}
                      </div>
                    )
                  })}
                </SwipeRow>
              )}
            </div>
          </div>
        )}
      </div>

      {selected && <VideoModal artist={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
