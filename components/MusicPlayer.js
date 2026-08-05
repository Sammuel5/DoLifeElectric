'use client'
import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'
import { useSession, signIn } from 'next-auth/react'

// ==============================================================
// SPOTIFY-STYLE MUSIC PLAYER
// - PlayerProvider: wraps the app, exposes play/pause/queue state
// - MiniPlayer: docked at bottom of music page when a song is playing
// - FullScreenPlayer: Now Playing view (big cover + full controls)
// - TrackRow: song row used in album tracklist
// - AlbumCard: cover tile in the albums grid
// - PlayerSpacer: empty div to push content up above the MiniPlayer
//
// The audio element + playback state lives in context so music keeps
// playing while you navigate between albums — just like Spotify.
// ==============================================================

const PlayerContext = createContext(null)

export function PlayerProvider({ children }) {
  const [queue, setQueue] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [fullScreen, setFullScreen] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  // Repeat mode: 'off' → stop at end; 'all' → loop the queue; 'one' → repeat current song
  const [repeat, setRepeat] = useState('off')
  const audioRef = useRef(null)
  const loggedRef = useRef({ plays: new Set(), downloads: new Set() })
  const historyRef = useRef([])
  // Ref mirror so callbacks can read latest repeat/shuffle without stale closures
  const repeatRef = useRef('off')
  const shuffleRef = useRef(false)
  useEffect(() => { repeatRef.current = repeat }, [repeat])
  useEffect(() => { shuffleRef.current = shuffle }, [shuffle])

  // Lazy-init audio element once on client
  useEffect(() => {
    if (!audioRef.current) {
      const el = document.createElement('audio')
      el.setAttribute('playsinline', '')
      el.setAttribute('webkit-playsinline', '')
      el.setAttribute('x5-playsinline', '')
      el.preload = 'metadata'
      document.body.appendChild(el)
      audioRef.current = el
    }
  }, [])

  const current = queue[currentIdx] || null

  // Fire-and-forget activity log
  const logActivity = useCallback((track, type) => {
    if (!track?._id) return
    const key = `${track._id}_${type}`
    const store = loggedRef.current[type === 'play' ? 'plays' : 'downloads']
    if (store.has(key)) return
    store.add(key)
    fetch('/api/music/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackId: track._id,
        trackTitle: track.title,
        artistName: track.artistName,
        activityType: type,
      }),
    }).catch(() => {})
  }, [])

  // Audio event wiring — re-wire when current track changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !current) return
    const onTime = () => setProgress(audio.currentTime)
    const onMeta = () => setDuration(audio.duration || 0)
    const onPlayEvt = () => logActivity(current, 'play')
    const onEnd = () => {
      // Song ended — handle based on repeat mode
      if (repeatRef.current === 'one') {
        // Repeat one: restart current song
        audio.currentTime = 0
        audio.play().catch(() => {})
        setProgress(0)
        return
      }
      // All other cases — advance using our next() logic (which handles shuffle + repeat-all)
      advanceNext()
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended', onEnd)
    audio.addEventListener('play', onPlayEvt)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('ended', onEnd)
      audio.removeEventListener('play', onPlayEvt)
    }
  }, [current, queue.length, logActivity])

  // Load new track when currentIdx or queue changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !current) return
    if (audio.src !== current.audioUrl) {
      audio.src = current.audioUrl
      audio.load()
      setProgress(0)
    }
  }, [current, currentIdx])

  // Play / pause sync
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) audio.play().catch(() => setPlaying(false))
    else audio.pause()
  }, [playing, currentIdx, queue])

  // --- Public controls ---
  // Fisher-Yates shuffle, keeping the starting track at index 0 so it plays first
  const shuffleList = useCallback((list, startTrackId = null) => {
    const arr = [...list]
    if (arr.length <= 1) return arr
    // If we have a starting track, put it first
    let startIdx = startTrackId ? arr.findIndex(t => t._id === startTrackId) : 0
    if (startIdx < 0) startIdx = 0
    // Swap start track to position 0
    if (startIdx !== 0) { [arr[0], arr[startIdx]] = [arr[startIdx], arr[0]] }
    // Shuffle positions 1..end
    for (let i = arr.length - 1; i > 1; i--) {
      const j = 1 + Math.floor(Math.random() * (i))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }, [])

  const playTracks = useCallback((tracks, startIndex = 0, options = {}) => {
    const list = Array.isArray(tracks) ? tracks : []
    if (!list.length) return
    const shouldShuffle = options.shuffle ?? shuffle
    let orderedList = list
    let idx = startIndex
    if (shouldShuffle) {
      orderedList = shuffleList(list, list[startIndex]?._id)
      idx = 0
    }
    historyRef.current = [] // reset history on new queue
    setQueue(orderedList)
    setCurrentIdx(idx)
    setPlaying(true)
    if (options.openFullScreen !== false) setFullScreen(true)
  }, [shuffle, shuffleList])

  const playTrack = useCallback((track, tracks, options = {}) => {
    const list = (Array.isArray(tracks) && tracks.length) ? tracks : [track]
    const idx = list.findIndex(t => t._id === track._id)
    playTracks(list, idx >= 0 ? idx : 0, options)
  }, [playTracks])

  // Helper: pick the next track index (shared by next() button and onEnd)
  const pickNextIdx = useCallback(() => {
    const len = queue.length
    if (len === 0) return 0
    if (shuffleRef.current && len > 1) {
      // Pick random that isn't current
      let n = Math.floor(Math.random() * (len - 1))
      if (n >= currentIdx) n++
      return n
    }
    // Sequential
    const atEnd = currentIdx >= len - 1
    if (atEnd) {
      if (repeatRef.current === 'all') return 0
      return -1 // signal stop
    }
    return currentIdx + 1
  }, [queue.length, currentIdx])

  const advanceNext = useCallback(() => {
    if (!queue.length) return
    historyRef.current.push(currentIdx)
    if (historyRef.current.length > 100) historyRef.current.shift()
    const n = pickNextIdx()
    if (n === -1) {
      setPlaying(false)
      return
    }
    setCurrentIdx(n)
    setPlaying(true)
  }, [queue.length, currentIdx, pickNextIdx])

  const togglePlay = useCallback(() => {
    if (!current) return
    setPlaying(p => !p)
  }, [current])

  const toggleShuffle = useCallback(() => {
    setShuffle(s => {
      const next = !s
      if (next && queue.length > 1) {
        setQueue(q => {
          const cur = q[currentIdx]
          if (!cur) return q
          historyRef.current = []
          const rest = q.filter((_, i) => i !== currentIdx)
          for (let i = rest.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[rest[i], rest[j]] = [rest[j], rest[i]]
          }
          const newQ = [cur, ...rest]
          // setCurrentIdx must happen outside setQueue updater; schedule it
          queueMicrotask(() => setCurrentIdx(0))
          return newQ
        })
      }
      return next
    })
  }, [queue.length, currentIdx])

  // Repeat cycles off → all → one → off
  const toggleRepeat = useCallback(() => {
    setRepeat(r => {
      if (r === 'off') return 'all'
      if (r === 'all') return 'one'
      return 'off'
    })
  }, [])

  const next = useCallback(() => {
    if (!queue.length) return
    if (repeatRef.current === 'one') {
      // Next button in repeat-one mode: still advance to next track (Spotify behavior)
      historyRef.current.push(currentIdx)
      if (historyRef.current.length > 100) historyRef.current.shift()
      const n = shuffleRef.current && queue.length > 1
        ? (() => { let x = Math.floor(Math.random() * (queue.length - 1)); if (x >= currentIdx) x++; return x })()
        : (currentIdx + 1) % queue.length
      setCurrentIdx(n)
      setPlaying(true)
      return
    }
    advanceNext()
  }, [queue.length, currentIdx, advanceNext])

  const prev = useCallback(() => {
    if (!queue.length) return
    const audio = audioRef.current
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      setProgress(0)
      return
    }
    if (shuffleRef.current && historyRef.current.length > 0) {
      const prevIdx = historyRef.current.pop()
      setCurrentIdx(prevIdx)
      setPlaying(true)
      return
    }
    // Sequential previous
    const atStart = currentIdx === 0
    if (atStart && repeatRef.current === 'all') {
      setCurrentIdx(queue.length - 1)
    } else {
      setCurrentIdx(i => (i - 1 + queue.length) % queue.length)
    }
    setPlaying(true)
  }, [queue.length, currentIdx])

  const seek = useCallback((t) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = t
    setProgress(t)
  }, [])

  const logDownload = useCallback((track) => {
    logActivity(track, 'download')
  }, [logActivity])

  const value = {
    current, playing, progress, duration, queue, currentIdx, fullScreen, shuffle, repeat,
    setFullScreen,
    playTracks, playTrack, togglePlay, toggleShuffle, toggleRepeat, next, prev, seek, logDownload,
    setPlaying,
  }

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider')
  return ctx
}

// --- Utility helpers ---
export function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

// Group tracks into album buckets (one card per album)
export function groupByAlbum(tracks) {
  const map = new Map()
  const singles = []
  tracks.forEach(t => {
    const key = (t.album && t.album.trim()) ? t.album.trim() : '__singles__'
    if (key === '__singles__') {
      singles.push(t)
    } else {
      if (!map.has(key)) map.set(key, {
        name: key,
        cover: t.coverImage || '',
        artist: t.artistName || 'DLE Entertainment',
        tracks: [],
        year: t.createdAt ? new Date(t.createdAt).getFullYear() : null,
      })
      const entry = map.get(key)
      entry.tracks.push(t)
      if (!entry.cover && t.coverImage) entry.cover = t.coverImage
      const y = t.createdAt ? new Date(t.createdAt).getFullYear() : null
      if (y && !entry.year) entry.year = y
    }
  })
  const albums = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  if (singles.length) {
    albums.push({
      name: 'Singles',
      cover: singles[0].coverImage || '',
      artist: 'Various Artists',
      tracks: singles,
      year: null,
      isSingles: true,
    })
  }
  return albums
}

// ----------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------

function TrackArtwork({ track, size = 'md' }) {
  const sizes = {
    xs: 'w-10 h-10',
    sm: 'w-12 h-12',
    md: 'w-14 h-14',
  }
  return (
    <div className={`${sizes[size]} flex-shrink-0 bg-dark-light overflow-hidden`}>
      {track?.coverImage ? (
        <img src={track.coverImage} alt={track.title} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center gold-text font-display text-2xl">♪</div>
      )}
    </div>
  )
}

// Small download button for track rows
function RowDownloadButton({ track }) {
  const { data: session } = useSession()
  const { logDownload } = usePlayer()

  if (!track?.audioUrl) return null

  if (!session?.user) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation()
          signIn('google', { callbackUrl: window.location.pathname })
        }}
        className="text-white/20 hover:text-gold p-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Sign in to download"
      >
        <LockIcon size={14} />
      </button>
    )
  }
  return (
    <a
      href={track.audioUrl}
      download
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        e.stopPropagation()
        logDownload(track)
      }}
      className="text-white/40 hover:text-gold p-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      title="Download"
    >
      <DownloadIcon size={14} />
    </a>
  )
}

// Row in a track list (album detail / queue)
export function TrackRow({ track, index, onPlay, showAlbum = false, showIndex = true }) {
  const { current, playing, togglePlay } = usePlayer()
  const isCurrent = current?._id === track._id

  const handleClick = () => {
    if (isCurrent) { togglePlay(); return }
    if (onPlay) onPlay(track, index)
  }

  return (
    <div
      onClick={handleClick}
      className={`group w-full flex items-center gap-3 px-2 sm:px-3 py-2 cursor-pointer transition-colors rounded ${
        isCurrent ? 'text-gold' : 'text-white/70 hover:text-white hover:bg-white/5'
      }`}
    >
      {showIndex && (
        <div className="w-6 text-center flex-shrink-0">
          {isCurrent && playing ? (
            <span className="inline-flex items-end gap-0.5 h-4 justify-center">
              <span className="w-0.5 bg-gold inline-block animate-[eq_0.8s_ease-in-out_infinite]" style={{height:'40%'}} />
              <span className="w-0.5 bg-gold inline-block animate-[eq_0.8s_ease-in-out_infinite]" style={{height:'80%',animationDelay:'0.15s'}} />
              <span className="w-0.5 bg-gold inline-block animate-[eq_0.8s_ease-in-out_infinite]" style={{height:'60%',animationDelay:'0.3s'}} />
            </span>
          ) : (
            <>
              <span className={`text-[11px] sm:text-xs font-mono group-hover:hidden ${isCurrent ? 'text-gold' : 'text-white/40'}`}>
                {String((index ?? 0) + 1).padStart(2, '0')}
              </span>
              <span className="hidden group-hover:inline-block text-white text-xs">▶</span>
            </>
          )}
        </div>
      )}
      <TrackArtwork track={track} size="sm" />
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate font-medium ${isCurrent ? 'text-gold' : 'text-white'}`}>{track.title}</p>
        <p className={`text-[11px] sm:text-xs truncate ${isCurrent ? 'text-gold/70' : 'text-white/40'}`}>
          {track.artistName || 'DLE Entertainment'}
          {showAlbum && track.album ? <span className="text-white/30"> · {track.album}</span> : null}
        </p>
      </div>
      <RowDownloadButton track={track} />
    </div>
  )
}

// Album card (cover tile) used in the browse grid
export function AlbumCard({ album, onClick }) {
  return (
    <button
      onClick={() => onClick && onClick(album)}
      className="w-40 sm:w-44 md:w-48 text-left group bg-dark-card hover:bg-white/10 p-3 rounded-md transition-all duration-200 active:scale-[0.97]"
    >
      <div className="relative w-full aspect-square bg-dark-light overflow-hidden shadow-lg mb-3">
        {album.cover ? (
          <img src={album.cover} alt={album.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center gold-text font-display text-5xl">♪</div>
        )}
        <div className="absolute bottom-2 right-2 w-11 h-11 rounded-full bg-gold text-dark flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
          <PlayIcon size={18} className="ml-0.5" />
        </div>
      </div>
      <p className="text-sm sm:text-base text-white font-semibold truncate">{album.name}</p>
      <p className="text-[11px] sm:text-xs text-white/50 truncate mt-0.5">
        {album.year ? `${album.year} • ` : ''}{album.artist || 'DLE Entertainment'}
      </p>
    </button>
  )
}

// Big hero for album detail view (Spotify-style gradient header)
export function AlbumHero({ album, onPlay, onShufflePlay, isPlayingThisAlbum }) {
  const { shuffle } = usePlayer()
  return (
    <div className="relative w-full">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: album.cover
            ? `linear-gradient(to bottom, rgba(20,20,20,0) 0%, #0f0f0f 100%), url(${album.cover}) center/cover no-repeat`
            : 'linear-gradient(to bottom, #C9A84C 0%, #0f0f0f 100%)',
          filter: 'blur(20px)',
          transform: 'scale(1.2)',
        }}
        aria-hidden="true"
      />
      {/* MOBILE: centered column (below sm breakpoint) */}
      <div className="relative w-full sm:hidden px-4 pt-6 pb-4 bg-gradient-to-b from-transparent via-dark-card/60 to-dark-card">
        <div className="flex flex-col items-center justify-center w-full">
          <div className="w-44 h-44 bg-dark-light shadow-2xl overflow-hidden mx-auto">
            {album.cover ? (
              <img src={album.cover} alt={album.name} className="w-full h-full object-cover shadow-2xl" />
            ) : (
              <div className="w-full h-full flex items-center justify-center gold-text font-display text-6xl">♪</div>
            )}
          </div>
          <div className="w-full text-center mt-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/80 mb-1">
              {album.isSingles ? 'Collection' : 'Album'}
            </p>
            <h1 className="font-display text-3xl font-black text-white leading-none break-words">
              {album.name}
            </h1>
            <p className="text-white/70 text-xs mt-2">
              <span className="font-semibold text-white">{album.artist}</span>
              {album.year ? <span className="text-white/50"> • {album.year}</span> : null}
              <span className="text-white/50"> • {album.tracks.length} song{album.tracks.length !== 1 ? 's' : ''}</span>
            </p>
          </div>
        </div>
      </div>

      {/* DESKTOP: left-aligned row (sm and up) */}
      <div className="hidden sm:block relative sm:pt-0 px-4 sm:px-6 md:px-8 pb-4 bg-gradient-to-b from-transparent via-dark-card/60 to-dark-card">
        <div className="flex flex-row items-end gap-7 max-w-5xl mx-auto">
          <div className="w-48 h-48 md:w-56 md:h-56 flex-shrink-0 bg-dark-light shadow-2xl overflow-hidden">
            {album.cover ? (
              <img src={album.cover} alt={album.name} className="w-full h-full object-cover shadow-2xl" />
            ) : (
              <div className="w-full h-full flex items-center justify-center gold-text font-display text-6xl">♪</div>
            )}
          </div>
          <div className="flex-1 min-w-0 text-left pb-2">
            <p className="text-xs font-bold uppercase tracking-widest text-white/80 mb-2">
              {album.isSingles ? 'Collection' : 'Album'}
            </p>
            <h1 className="font-display text-4xl md:text-6xl font-black text-white leading-none mb-4 break-words">
              {album.name}
            </h1>
            <p className="text-white/70 text-sm">
              <span className="font-semibold text-white">{album.artist}</span>
              {album.year ? <span className="text-white/50"> • {album.year}</span> : null}
              <span className="text-white/50"> • {album.tracks.length} song{album.tracks.length !== 1 ? 's' : ''}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Play button row */}
      <div className="relative flex items-center gap-4 px-4 sm:px-6 md:px-8 pb-5 pt-1 bg-dark-card w-full">
        <div className="max-w-5xl mx-auto w-full flex items-center gap-4">
          <button
            onClick={onPlay}
            className="w-14 h-14 rounded-full bg-gold hover:bg-[#E6C76A] text-dark flex items-center justify-center shadow-[0_0_24px_rgba(201,168,76,0.4)] hover:scale-105 active:scale-95 transition-transform flex-shrink-0"
            aria-label="Play album"
            title={isPlayingThisAlbum ? 'Pause' : 'Play in order'}
          >
            {isPlayingThisAlbum ? <PauseIcon size={22} /> : <PlayIcon size={22} className="ml-0.5" />}
          </button>
          <button
            onClick={onShufflePlay}
            className={`p-2 flex-shrink-0 rounded-full transition-all active:scale-90 ${
              shuffle && isPlayingThisAlbum
                ? 'text-gold bg-gold/15'
                : 'text-white/60 hover:text-gold'
            }`}
            aria-label="Shuffle play"
            title="Shuffle play"
          >
            <ShuffleIcon size={22} />
            {shuffle && isPlayingThisAlbum && (
              <span className="block w-1 h-1 rounded-full bg-gold mx-auto mt-0.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Mini-player bar docked at bottom (Spotify persistent player)
export function MiniPlayer() {
  const { data: session } = useSession()
  const { current, playing, togglePlay, next, prev, progress, duration, seek, setFullScreen, logDownload } = usePlayer()

  if (!current) return null
  const pct = duration ? (progress / duration) * 100 : 0

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#141414] border-t border-white/10 z-40 safe-bottom">
      <div className="max-w-7xl mx-auto">
        <div className="h-0.5 bg-white/10 relative cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            const t = (x / rect.width) * duration
            if (!isNaN(t)) seek(t)
          }}
        >
          <div className="h-full bg-gold group-hover:bg-[#E6C76A] transition-colors" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center gap-2 sm:gap-3 h-16 sm:h-20 px-2 sm:px-4">
          <button onClick={() => setFullScreen(true)} className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 hover:bg-white/5 rounded p-1 text-left active:scale-[0.98]">
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 bg-dark-light overflow-hidden">
              {current.coverImage ? (
                <img src={current.coverImage} alt={current.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center gold-text text-lg">♪</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs sm:text-sm font-medium truncate">{current.title}</p>
              <p className="text-white/50 text-[10px] sm:text-xs truncate">{current.artistName || 'DLE Entertainment'}</p>
            </div>
          </button>
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={prev} className="text-white/70 hover:text-white p-2 active:scale-90" aria-label="Previous">
              <PrevIcon size={18} />
            </button>
            <button onClick={togglePlay} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg">
              {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} className="ml-0.5" />}
            </button>
            <button onClick={next} className="text-white/70 hover:text-white p-2 active:scale-90" aria-label="Next">
              <NextIcon size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Full-screen "Now Playing" view (Spotify-style like your screenshot)
export function FullScreenPlayer({ onClose }) {
  const { current, playing, shuffle, repeat, toggleShuffle, toggleRepeat, togglePlay, next, prev, progress, duration, seek } = usePlayer()

  if (!current) return null
  const pct = duration ? (progress / duration) * 100 : 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden safe-top safe-bottom"
      style={{
        background: current.coverImage
          ? 'linear-gradient(to bottom, rgba(60,45,15,0.95) 0%, #1a1208 40%, #0a0a0a 100%)'
          : 'linear-gradient(to bottom, #2a220e 0%, #0a0a0a 100%)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onClose} className="text-white/80 hover:text-white p-2 active:scale-90" aria-label="Close">
          <ChevronDownIcon size={26} />
        </button>
        <div className="text-center px-2 min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-white/60 font-semibold">Playing from album</p>
          <p className="text-white text-xs sm:text-sm font-semibold truncate">{current.album || 'DLE Entertainment'}</p>
        </div>
        <button className="text-white/80 hover:text-white p-2 active:scale-90" aria-label="More">
          <DotsIcon size={22} />
        </button>
      </div>

      {/* Cover */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-4 min-h-0">
        <div className={`w-full max-w-sm aspect-square shadow-2xl overflow-hidden transition-transform duration-300 ${playing ? '' : 'scale-95 opacity-95'}`}>
          {current.coverImage ? (
            <img src={current.coverImage} alt={current.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-dark-light flex items-center justify-center gold-text font-display text-8xl">♪</div>
          )}
        </div>
      </div>

      {/* Song info + controls */}
      <div className="px-6 sm:px-10 pb-6 w-full max-w-xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-white text-2xl sm:text-3xl font-bold truncate">{current.title}</h2>
            <p className="text-gold text-sm sm:text-base font-semibold truncate mt-1">
              {current.artistName || 'DLE Entertainment'}
            </p>
          </div>
          <button className="text-white/60 hover:text-gold p-2 active:scale-90 flex-shrink-0" aria-label="Like">
            <HeartIcon size={24} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <input
            type="range" min={0} max={duration || 0} value={progress}
            onChange={e => seek(parseFloat(e.target.value))}
            className="w-full fs-slider"
            style={{
              background: `linear-gradient(to right, #fff ${pct}%, rgba(255,255,255,0.25) ${pct}%)`
            }}
          />
          <div className="flex justify-between text-[10px] sm:text-xs text-white/60 mt-1.5 font-mono">
            <span>{fmtTime(progress)}</span>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <button
            onClick={toggleShuffle}
            className={`p-2 rounded-full transition-colors active:scale-90 ${
              shuffle ? 'text-gold' : 'text-white/60 hover:text-white'
            }`}
            aria-label="Toggle shuffle"
            title={shuffle ? 'Shuffle on' : 'Shuffle off'}
          >
            <ShuffleIcon size={20} />
            {shuffle && <span className="block w-1 h-1 rounded-full bg-gold mx-auto mt-0.5" />}
          </button>
          <button onClick={prev} className="text-white hover:scale-105 active:scale-90 transition-transform p-2" aria-label="Previous">
            <PrevIcon size={32} />
          </button>
          <button onClick={togglePlay} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gold text-dark flex items-center justify-center shadow-[0_0_30px_rgba(201,168,76,0.4)] hover:scale-105 active:scale-95 transition-transform" aria-label="Play/Pause">
            {playing ? <PauseIcon size={28} /> : <PlayIcon size={28} className="ml-1" />}
          </button>
          <button onClick={next} className="text-white hover:scale-105 active:scale-90 transition-transform p-2" aria-label="Next">
            <NextIcon size={32} />
          </button>
          <button
            onClick={toggleRepeat}
            className={`p-2 rounded-full transition-colors active:scale-90 relative ${
              repeat !== 'off' ? 'text-gold' : 'text-white/60 hover:text-white'
            }`}
            aria-label={`Repeat: ${repeat}`}
            title={`Repeat: ${repeat === 'off' ? 'off' : repeat === 'all' ? 'all' : 'one'}`}
          >
            {repeat === 'one' ? <RepeatOneIcon size={20} /> : <RepeatIcon size={20} />}
            {repeat !== 'off' && <span className="block w-1 h-1 rounded-full bg-gold mx-auto mt-0.5" />}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes eq {
          0%, 100% { height: 30%; }
          50% { height: 100%; }
        }
        .fs-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 2px;
          outline: none;
        }
        .fs-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px; height: 12px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
        }
        .fs-slider::-moz-range-thumb {
          width: 12px; height: 12px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}

export function PlayerSpacer() {
  return <div className="h-16 sm:h-20" aria-hidden="true" />
}

// ----------------------------------------------------------------
// INLINE ICONS (no extra imports needed)
// ----------------------------------------------------------------
function PlayIcon({ size = 20, className = '' }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}><polygon points="6 3 20 12 6 21 6 3"/></svg>
}
function PauseIcon({ size = 20, className = '' }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
}
function PrevIcon({ size = 20, className = '' }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}><polygon points="19 20 9 12 19 4 19 20"/><rect x="5" y="4" width="2" height="16" rx="0.5"/></svg>
}
function NextIcon({ size = 20, className = '' }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}><polygon points="5 4 15 12 5 20 5 4"/><rect x="17" y="4" width="2" height="16" rx="0.5"/></svg>
}
function DownloadIcon({ size = 16, className = '' }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
}
function LockIcon({ size = 14, className = '' }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
}
function ShuffleIcon({ size = 20, className = '' }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="16 3 21 3 21 8"/><line x1="4" x2="21" y1="20" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" x2="21" y1="15" y2="21"/><line x1="4" x2="9" y1="4" y2="9"/></svg>
}
function RepeatIcon({ size = 20, className = '' }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
}
function RepeatOneIcon({ size = 20, className = '' }) {
  // Repeat with "1" badge (repeat-one mode)
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m17 2 4 4-4 4"/>
      <path d="M3 11v-1a4 4 0 0 1 4-4h14"/>
      <path d="m7 22-4-4 4-4"/>
      <path d="M21 13v1a4 4 0 0 1-4 4H3"/>
      <text x="12" y="14" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none">1</text>
    </svg>
  )
}
function HeartIcon({ size = 24, className = '' }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
}
function ChevronDownIcon({ size = 24, className = '' }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="6 9 12 15 18 9"/></svg>
}
function DotsIcon({ size = 22, className = '' }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>
}
