// Shared cover-resolution helper. Used by API routes and player components.
// Priority: track.coverImage → genre.coverImage → DLE logo default.

export const DEFAULT_TRACK_COVER = '/dlelogo/dle-logo-sm.webp'
export const DEFAULT_GENRE_COVER = '/dlelogo/dle-logo-sm.webp'

export function resolveEffectiveCover(track, genre) {
  if (track && track.coverImage) return track.coverImage
  if (genre && genre.coverImage) return genre.coverImage
  return DEFAULT_TRACK_COVER
}

// Attach effectiveCover + genreCover onto a plain track document given a
// Map of genreId → genreDoc.
export function decorateTrack(track, genreMap) {
  if (!track) return track
  const t = track.toObject ? track.toObject({ virtuals: true }) : { ...track }
  const gid = t.genreId
    ? (typeof t.genreId === 'object' && t.genreId._id
        ? t.genreId._id.toString()
        : String(t.genreId))
    : null
  const genre = gid ? genreMap.get(gid) : null
  t.genreCover = genre?.coverImage || ''
  t.effectiveCover = resolveEffectiveCover(t, genre)
  return t
}
