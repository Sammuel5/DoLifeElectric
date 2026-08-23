'use client'
import { useEffect, useState, useMemo } from 'react'
import { Search, ArrowLeft, Lock, Disc3 } from 'lucide-react'
import { useSession, signIn } from 'next-auth/react'
import {
  usePlayer,
  groupByAlbum,
  AlbumCard,
  AlbumHero,
  TrackRow,
  MiniPlayer,
  FullScreenPlayer,
  PlayerSpacer,
} from '@/components/MusicPlayer'

export default function MusicPage() {
  const { data: session } = useSession()
  const { current, playing, shuffle, toggleShuffle, togglePlay, playTracks, setFullScreen, fullScreen } = usePlayer()

  const [tracks, setTracks] = useState([])
  const [genres, setGenres] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activeGenre, setActiveGenre] = useState('all') // 'all' or genre._id
  const [activeAlbum, setActiveAlbum] = useState(null) // album object when viewing an album

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/music').then(r => r.json()).catch(() => []),
      fetch('/api/genres').then(r => r.json()).catch(() => []),
    ]).then(([t, g]) => {
      setTracks(Array.isArray(t) ? t : [])
      setGenres(Array.isArray(g) ? g : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Filter by genre first, then search
  const genreFilteredTracks = useMemo(() => {
    if (activeGenre === 'all') return tracks
    return tracks.filter(t => {
      if (!t.genreId && !t.genreName) return false
      return String(t.genreId || '') === String(activeGenre) || t.genreName === activeGenre
    })
  }, [tracks, activeGenre])

  const albums = useMemo(() => groupByAlbum(genreFilteredTracks), [genreFilteredTracks])

  // Filter albums/songs by search
  const filteredAlbums = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return albums
    return albums
      .map(album => {
        const nameMatch = album.name.toLowerCase().includes(q)
        const artistMatch = (album.artist || '').toLowerCase().includes(q)
        const matchedTracks = album.tracks.filter(t =>
          t.title?.toLowerCase().includes(q) ||
          t.artistName?.toLowerCase().includes(q) ||
          t.genreName?.toLowerCase().includes(q)
        )
        if (nameMatch || artistMatch) return album
        if (matchedTracks.length) return { ...album, tracks: matchedTracks }
        return null
      })
      .filter(Boolean)
  }, [albums, query])

  // Genres that actually have tracks (plus any that admin created, but we show all for discoverability)
  // Always show "All" first; sort by order, then by trackCount desc, then name
  const visibleGenres = useMemo(() => {
    const sorted = [...genres].sort((a, b) => {
      if ((a.order || 0) !== (b.order || 0)) return (a.order || 0) - (b.order || 0)
      if ((b.trackCount || 0) !== (a.trackCount || 0)) return (b.trackCount || 0) - (a.trackCount || 0)
      return (a.name || '').localeCompare(b.name || '')
    })
    return sorted
  }, [genres])

  const currentGenreName = useMemo(() => {
    if (activeGenre === 'all') return null
    const g = genres.find(x => x._id === activeGenre)
    return g ? g.name : null
  }, [activeGenre, genres])

  const isPlayingThisAlbum = activeAlbum && current &&
    activeAlbum.tracks.some(t => t._id === current._id) && playing

  const handlePlayAlbum = (album) => {
    const trackIds = new Set(album.tracks.map(t => t._id))
    if (current && trackIds.has(current._id)) {
      togglePlay()
      return
    }
    playTracks(album.tracks, 0, { shuffle: shuffle })
  }

  const handleShufflePlayAlbum = (album) => {
    const trackIds = new Set(album.tracks.map(t => t._id))
    if (shuffle && current && trackIds.has(current._id)) {
      toggleShuffle()
      return
    }
    if (!shuffle) toggleShuffle()
    playTracks(album.tracks, 0, { shuffle: true })
  }

  const handlePlayTrackInAlbum = (track, _idx) => {
    const list = activeAlbum ? activeAlbum.tracks : [track]
    playTracks(list, list.findIndex(t => t._id === track._id), { shuffle: shuffle })
  }

  return (
    <div className="min-h-screen bg-dark pb-20 cinematic-dark">
      {/* ======= BROWSE ALL ALBUMS ======= */}
      {!activeAlbum && (
        <div className="pt-20 md:pt-28 pb-6 px-3 sm:px-6 max-w-7xl mx-auto">
          <div className="mb-6 md:mb-8">
            <p className="text-gold text-xs uppercase tracking-[0.4em] mb-2">Discography</p>
            <h1 className="font-display font-bold text-white text-4xl md:text-6xl uppercase leading-none mb-3">
              Our <span className="gold-text">Music</span>
            </h1>
            <p className="text-white/50 text-sm md:text-base">
              Pick a genre, then an album — tap any song to play.
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-4 md:mb-5 max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search songs, artists, albums..."
              className="form-input pl-11 w-full"
            />
          </div>

          {/* Genre filter pills */}
          {visibleGenres.length > 0 && (
            <div className="mb-6 md:mb-8 -mx-3 px-3 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar">
              <div className="flex gap-2 min-w-max pb-1">
                <button
                  onClick={() => setActiveGenre('all')}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-[11px] sm:text-xs uppercase tracking-widest font-semibold rounded-full transition-all whitespace-nowrap ${
                    activeGenre === 'all'
                      ? 'bg-gold text-dark shadow-[0_0_12px_rgba(201,168,76,0.4)]'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                >
                  <Disc3 size={13} /> All
                </button>
                {visibleGenres.map(g => (
                  <button
                    key={g._id}
                    onClick={() => setActiveGenre(activeGenre === g._id ? 'all' : g._id)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-[11px] sm:text-xs uppercase tracking-widest font-semibold rounded-full transition-all whitespace-nowrap ${
                      activeGenre === g._id
                        ? 'bg-gold text-dark shadow-[0_0_12px_rgba(201,168,76,0.4)]'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                    }`}
                    style={
                      activeGenre === g._id && g.color
                        ? { background: g.color, color: '#0A0A0A' }
                        : {}
                    }
                  >
                    {g.name}
                    {typeof g.trackCount === 'number' && g.trackCount > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          activeGenre === g._id ? 'bg-black/20 text-dark' : 'bg-white/10 text-white/50'
                        }`}
                      >
                        {g.trackCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active genre header */}
          {currentGenreName && (
            <div className="mb-5 flex items-center gap-3">
              <div
                className="px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold"
                style={{ background: 'rgba(201,168,76,0.15)', color: '#E6C76A', border: '1px solid rgba(201,168,76,0.3)' }}
              >
                {currentGenreName}
              </div>
              <button
                onClick={() => setActiveGenre('all')}
                className="text-white/40 hover:text-white text-xs flex items-center gap-1"
              >
                <ArrowLeft size={12} /> Clear filter
              </button>
            </div>
          )}

          {/* Sign-in banner for downloads */}
          {!session && (
            <div className="mb-6 bg-gold/10 border border-gold/30 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded">
              <p className="text-gold/90 text-xs sm:text-sm flex items-center gap-2 text-center sm:text-left">
                <Lock size={14} className="flex-shrink-0" />
                <span>Streaming is free for everyone — <strong>sign in with Google</strong> to download tracks.</span>
              </p>
              <button
                onClick={() => signIn('google', { callbackUrl: '/music' })}
                className="btn-gold text-xs whitespace-nowrap"
              >
                Sign in to download
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {Array.from({length: 8}).map((_, i) => (
                <div key={i} className="w-40 sm:w-44 md:w-48 animate-pulse">
                  <div className="w-full aspect-square bg-dark-card mb-3" />
                  <div className="h-3 bg-dark-card w-3/4 mb-2" />
                  <div className="h-2 bg-dark-card w-1/2" />
                </div>
              ))}
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center text-white/40 py-24 font-display text-lg uppercase tracking-widest">
              Music coming soon
            </div>
          ) : filteredAlbums.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-white/40 font-display text-lg uppercase tracking-widest mb-2">
                {currentGenreName ? `No tracks in ${currentGenreName} yet` : 'No results'}
              </p>
              <button
                onClick={() => { setQuery(''); setActiveGenre('all') }}
                className="text-gold text-sm hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 justify-items-start">
              {filteredAlbums.map(album => (
                <AlbumCard
                  key={album.name}
                  album={album}
                  onClick={(a) => setActiveAlbum(a)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======= ALBUM DETAIL VIEW ======= */}
      {activeAlbum && (
        <div className="min-h-screen pt-16 sm:pt-0">
          <AlbumHero album={activeAlbum} onPlay={() => handlePlayAlbum(activeAlbum)} onShufflePlay={() => handleShufflePlayAlbum(activeAlbum)} isPlayingThisAlbum={isPlayingThisAlbum} />

          {/* Back button + tracklist */}
          <div className="bg-dark-card/50 px-0">
            <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4">
              <button
                onClick={() => setActiveAlbum(null)}
                className="text-white/60 hover:text-white flex items-center gap-2 text-sm mb-4 p-2 -ml-2 active:scale-95 transition-transform"
              >
                <ArrowLeft size={18} />
                Back to all music
              </button>

              {/* Table header (desktop only) */}
              <div className="hidden sm:grid grid-cols-[32px_1fr_auto] gap-3 px-3 pb-2 border-b border-white/10 text-[11px] uppercase tracking-widest text-white/40">
                <span className="text-right">#</span>
                <span>Title</span>
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </span>
              </div>

              <div className="divide-y divide-white/5 -mx-1 sm:mx-0">
                {activeAlbum.tracks.map((t, i) => (
                  <TrackRow
                    key={t._id}
                    track={t}
                    index={i}
                    onPlay={handlePlayTrackInAlbum}
                  />
                ))}
              </div>

              {/* End spacer */}
              <div className="h-24" />
            </div>
          </div>
        </div>
      )}

      {/* Mini player bar (docked at bottom when a song is loaded) */}
      <MiniPlayer />
      <PlayerSpacer />

      {/* Full-screen now playing */}
      {fullScreen && current && (
        <FullScreenPlayer onClose={() => setFullScreen(false)} />
      )}

      {/* Equalizer animation keyframes (injected once) */}
      <style jsx global>{`
        @keyframes eq {
          0%, 100% { height: 30%; }
          50% { height: 100%; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
