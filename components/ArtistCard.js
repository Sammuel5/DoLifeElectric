'use client'

export default function ArtistCard({ artist, onClick }) {
  return (
    <div className="artist-card group aspect-[3/4] bg-dark-light relative overflow-hidden cursor-pointer" onClick={onClick}>
      {artist.image ? (
        <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-light to-dark text-white/30 font-display text-4xl sm:text-5xl">
          {artist.name?.[0] || '?'}
        </div>
      )}
      <div className="overlay flex flex-col justify-end p-3 sm:p-5 pointer-events-none">
        {/* Name with proper wrapping */}
        <h3 className="font-display text-lg sm:text-2xl md:text-3xl text-white uppercase tracking-wider leading-[1.05] break-words artist-name"
            style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
          {artist.name}
        </h3>
        {artist.title && (
          <p className="text-gold text-[10px] sm:text-xs uppercase tracking-widest mt-1 truncate artist-title">
            {artist.title}
          </p>
        )}
        {artist.isGroup && <span className="text-white/50 text-[10px] sm:text-xs uppercase mt-0.5">Group</span>}
      </div>
      <button className="gifts-btn hidden md:block" onClick={e => { e.stopPropagation(); onClick() }}>🎁 Gifts</button>
    </div>
  )
}
