'use client'
import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import GiftDonation from './GiftDonation'

function getYouTubeId(url) {
  if (!url) return null
  const patterns = [/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/]
  for (const p of patterns) { const m = url.match(p); if (m) return m[1] }
  return null
}
function getTikTokId(url) {
  if (!url) return null
  const patterns = [/tiktok\.com\/@[\w.]+\/video\/(\d+)/, /tiktok\.com\/t\/(\w+)/, /vm\.tiktok\.com\/(\w+)/]
  for (const p of patterns) { const m = url.match(p); if (m) return m[1] }
  return null
}
function isDirectVideo(url) {
  if (!url) return false
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url) || url.startsWith('/uploads/videos/')
}

export default function VideoModal({ artist, onClose }) {
  const videoRef = useRef(null)
  const iframeRef = useRef(null)
  const [videoEnded, setVideoEnded] = useState(false)
  const [showGifts, setShowGifts] = useState(false)

  const hasVideo = !!(artist && artist.videoUrl && artist.videoUrl.trim())
  const ytId = hasVideo ? getYouTubeId(artist.videoUrl) : null
  const ttId = hasVideo ? getTikTokId(artist.videoUrl) : null
  const directVideo = hasVideo ? isDirectVideo(artist.videoUrl) : false
  const externalVideo = hasVideo && !ytId && !ttId && !directVideo
  const videoType = ytId ? 'youtube' : ttId ? 'tiktok' : directVideo ? 'direct' : externalVideo ? 'external' : 'none'

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Scroll to top of screen so modal is visible on mobile
    window.scrollTo(0, 0)
    const esc = e => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', esc)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', esc)
    }
  }, [])

  useEffect(() => {
    if (videoRef.current && directVideo) {
      videoRef.current.muted = false
      videoRef.current.play()
        .then(() => {})
        .catch(() => {
          if (videoRef.current) { videoRef.current.muted = true; videoRef.current.play().catch(() => {}) }
        })
    }
  }, [directVideo])

  const handleClose = () => {
    if (videoRef.current) videoRef.current.pause()
    if (iframeRef.current) iframeRef.current.src = ''
    onClose()
  }

  if (!artist) return null

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex items-start sm:items-center justify-center overflow-y-auto p-2 sm:p-4 backdrop-blur-sm safe-pt"
         onClick={e => { if (e.target === e.currentTarget) handleClose() }}
         style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="relative w-full max-w-xl sm:max-w-2xl bg-dark-card border border-white/10 shadow-2xl my-auto mt-2 sm:mt-0 mb-safe">
        {/* Close & Gifts buttons */}
        <div className="absolute top-2 right-2 z-20 flex gap-2">
          {!videoEnded && !showGifts && (
            <button onClick={() => setShowGifts(true)}
              className="bg-gold text-dark font-bold px-3 sm:px-4 py-2 text-xs uppercase tracking-wider hover:bg-[#E6C76A] flex items-center gap-1.5 min-h-[36px] active:scale-95">
              🎁 <span className="hidden sm:inline">Gifts</span>
            </button>
          )}
          <button onClick={handleClose} className="text-white/70 hover:text-gold bg-black/60 rounded-full p-2 active:scale-90" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {!showGifts ? (
          <div className="bg-black">
            {videoType === 'youtube' ? (
              <div className="relative w-full aspect-video bg-black">
                <iframe ref={iframeRef}
                  src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                  title={artist.name} className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen playsInline />
              </div>
            ) : videoType === 'tiktok' ? (
              <div className="relative w-full bg-black flex items-center justify-center py-2 sm:py-4 overflow-hidden">
                <iframe ref={iframeRef} src={`https://www.tiktok.com/embed/v2/${ttId}`}
                  title={artist.name}
                  className="w-[280px] xs:w-[300px] sm:w-[340px] h-[490px] sm:h-[600px] max-w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen />
              </div>
            ) : videoType === 'direct' ? (
              <div className="relative w-full bg-black flex items-center justify-center">
                <video ref={videoRef} src={artist.videoUrl}
                  className="max-h-[50vh] sm:max-h-[70vh] w-full sm:w-auto max-w-full"
                  controls playsInline webkit-playsinline="true" x5-playsinline="true" controlsList="nodownload noplaybackrate"
                  poster={artist.image}
                  onEnded={() => setVideoEnded(true)} />
              </div>
            ) : videoType === 'external' ? (
              <div className="relative w-full aspect-video bg-black flex flex-col items-center justify-center p-6 text-center">
                {artist.image && <img src={artist.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
                <div className="relative z-10">
                  <p className="text-white/90 text-sm mb-3">External video</p>
                  <a href={artist.videoUrl} target="_blank" rel="noopener noreferrer" className="btn-gold inline-block">▶ Watch Video</a>
                </div>
              </div>
            ) : (
              <div className="relative w-full bg-black flex items-center justify-center">
                {artist.image ? (
                  <img src={artist.image} alt={artist.name} className="w-full max-h-[50vh] sm:max-h-[70vh] object-contain" />
                ) : (
                  <div className="w-full aspect-[3/4] flex items-center justify-center text-white/30 font-display text-4xl sm:text-5xl">{artist.name?.[0]}</div>
                )}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-1.5 text-white/70 text-[10px] sm:text-xs uppercase tracking-widest">
                  No opening video set
                </div>
              </div>
            )}

            {videoEnded && (
              <div className="absolute inset-0 bg-black/92 flex flex-col items-center justify-center gap-4 p-6">
                <h3 className="font-display text-2xl sm:text-3xl gold-text uppercase text-center">Support {artist.name}</h3>
                <p className="text-white/70 text-center max-w-md text-xs sm:text-sm">Send a gift to show support, or exit to continue browsing.</p>
                <div className="flex flex-col w-full max-w-xs gap-3">
                  <button onClick={() => setShowGifts(true)} className="btn-gold py-3.5">🎁 Send a Gift</button>
                  <button onClick={handleClose} className="btn-outline py-3.5">Exit</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-h-[80vh] sm:max-h-[85vh] overflow-y-auto -webkit-overflow-scrolling-touch">
            <GiftDonation artist={artist} onBack={() => setShowGifts(false)} onClose={handleClose} />
          </div>
        )}

        {!showGifts && (
          <div className="p-4 sm:p-5 bg-dark-card">
            <h3 className="font-display text-lg sm:text-2xl text-white uppercase tracking-wide leading-tight break-words">{artist.name}</h3>
            {artist.title && <p className="text-gold text-xs sm:text-sm mt-1 uppercase tracking-widest break-words">{artist.title}</p>}
            {artist.bio && <p className="text-white/60 text-xs sm:text-sm mt-2 line-clamp-4">{artist.bio}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
