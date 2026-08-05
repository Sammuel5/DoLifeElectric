'use client'
import { useEffect, useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import toast from 'react-hot-toast'
import ArtistCard from '@/components/ArtistCard'
import VideoModal from '@/components/VideoModal'

export default function ArtistsPage() {
  const [artists, setArtists] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch('/api/artists')
      .then(r => r.json())
      .then(data => { setArtists(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Handle return from PayMongo (success/cancel) — show toast + open that artist's modal
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const giftStatus = url.searchParams.get('gift')
    const donationId = url.searchParams.get('donation')
    const artistName = url.searchParams.get('artist')
    const artistId = url.searchParams.get('artistId')

    if (giftStatus === 'success') {
      const name = artistName ? decodeURIComponent(artistName) : 'the artist'
      toast.success(`🎁 Thank you! Your gift to ${name} was sent successfully.`, { duration: 6000 })
    } else if (giftStatus === 'cancelled') {
      toast('Gift cancelled — no payment was taken.', { icon: 'ℹ️' })
    }

    // If we have an artistId and artists are loaded, open their modal
    if ((giftStatus === 'success' || giftStatus === 'cancelled') && artistId) {
      const tryOpen = () => {
        const found = artists.find(a => String(a._id) === String(artistId))
        if (found) {
          setSelected(found)
          // Clean URL so refresh doesn't re-fire the toast
          window.history.replaceState({}, '', '/artists')
        }
      }
      if (artists.length) tryOpen()
      // Artists not loaded yet — try again when they arrive (effect below with artists deps handles it)
      else {
        const interval = setInterval(() => {
          if (artists.length) { tryOpen(); clearInterval(interval) }
        }, 200)
        setTimeout(() => clearInterval(interval), 8000)
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
  const soloists = filtered.filter(a => !a.isGroup && !a.groupId)
  const groupMembers = filtered.filter(a => !a.isGroup && a.groupId)
  // All individual artists (solo + members) — so every person is scrollable as a card
  const individuals = filtered.filter(a => !a.isGroup)

  const getMembers = (groupId) => artists.filter(a => a.groupId && String(a.groupId) === String(groupId))
  const parentGroup = (artist) => {
    if (!artist.groupId) return null
    return artists.find(g => g.isGroup && String(g._id) === String(artist.groupId)) || null
  }

  return (
    <div className="py-10 md:py-20 px-3 sm:px-6 max-w-7xl mx-auto min-h-screen pb-24 safe-bottom">
      <div className="mb-8 md:mb-10">
        <p className="text-gold text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-2 sm:mb-3">Full Roster</p>
        <h1 className="font-display font-bold text-white text-3xl sm:text-4xl md:text-6xl uppercase leading-none mb-3 sm:mb-4">
          Our <span className="gold-text">Talents</span>
        </h1>
        <p className="text-white/50 max-w-xl text-xs sm:text-sm md:text-base">
          Browse all groups and artists. Click any card or member name to watch their video and send gifts. Every artist — solo or in a group — is listed below.
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search artists by name, title..." className="form-input pl-11 w-full" />
        </div>
        <div className="flex gap-1 overflow-x-auto no-scrollbar" style={{WebkitOverflowScrolling:"touch"}}>
          {[
            { id: 'all', label: 'All' },
            { id: 'group', label: 'Groups' },
            { id: 'solo', label: 'Artists' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-4 py-2.5 text-xs uppercase tracking-widest font-semibold transition-colors flex-shrink-0 ${filter === f.id ? 'bg-gold text-dark' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => <div key={i} className="aspect-[3/4] bg-dark-card animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-white/10 p-8 sm:p-12 text-center">
          <p className="text-white/40 font-display text-lg sm:text-xl uppercase tracking-widest mb-2">No artists found</p>
          {query && <button onClick={() => setQuery('')} className="text-gold text-sm hover:underline">Clear search</button>}
        </div>
      ) : (
        <div className="space-y-8 md:space-y-12">
          {/* GROUPS */}
          {groups.length > 0 && filter !== 'solo' && (
            <section>
              <h2 className="font-display text-xl sm:text-2xl md:text-3xl text-white uppercase mb-5 sm:mb-6">
                Groups <span className="text-white/40 text-base sm:text-lg">({groups.length})</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                {groups.map(g => {
                  const members = getMembers(g._id)
                  return (
                    <div key={g._id} className="space-y-2">
                      <ArtistCard artist={g} onClick={() => setSelected(g)} />
                      {members.length > 0 && (
                        <div className="px-1 space-y-1">
                          <p className="text-[10px] text-white/40 uppercase tracking-wider">{members.length} member{members.length !== 1 ? 's' : ''}:</p>
                          <div className="flex flex-wrap gap-1">
                            {members.map(m => (
                              <button key={m._id}
                                onClick={() => setSelected(m)}
                                className="text-[10px] sm:text-xs text-gold/80 hover:text-gold bg-gold/10 hover:bg-gold/20 px-2 py-1 transition-colors truncate max-w-full">
                                {m.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ALL INDIVIDUAL ARTISTS (solo + group members) */}
          {individuals.length > 0 && filter !== 'group' && (
            <section>
              <h2 className="font-display text-xl sm:text-2xl md:text-3xl text-white uppercase mb-5 sm:mb-6">
                Artists <span className="text-white/40 text-base sm:text-lg">({individuals.length})</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                {individuals.map(a => {
                  const group = parentGroup(a)
                  return (
                    <div key={a._id} className="space-y-1.5">
                      <ArtistCard artist={a} onClick={() => setSelected(a)} />
                      {group && (
                        <p className="text-[10px] sm:text-xs text-gold/60 text-center px-1 truncate">
                          Member of <span className="text-gold/90 font-semibold">{group.name}</span>
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {selected && <VideoModal artist={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
