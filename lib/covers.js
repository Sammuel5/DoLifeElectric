// Shared cover-resolution helper. Used by API routes and player components.
// Priority: track.coverImage → genre.coverImage → DLE logo default.

export const DEFAULT_TRACK_COVER = '/dlelogo/dle-logo-sm.webp'
export const DEFAULT_GENRE_COVER = '/dlelogo/dle-logo-sm.webp'

// Transform a Cloudinary URL (res.cloudinary.com/.../upload/...) to add
// f_auto,q_auto and optional width transforms so covers load at tiny WebP sizes.
// Non-Cloudinary URLs pass through untouched.
export function optimizeCloudinaryUrl(url, width = null) {
  if (!url || typeof url !== 'string') return url
  // Skip our own local/public paths and data URIs
  if (url.startsWith('/') || url.startsWith('data:')) return url
  // Only transform Cloudinary URLs
  if (!/res\.cloudinary\.com|cloudinary\.com\//.test(url)) return url
  // Inject f_auto,q_auto (+ w_<width>) into the /upload/ segment if not already there
  const has = /\/upload\/(?:[^/]+,)*?f_auto/.test(url)
  if (has) return url
  const transforms = ['f_auto', 'q_auto']
  if (width) transforms.push(`w_${width}`, 'c_fill')
  const flag = transforms.join(',') + '/'
  return url.replace('/upload/', '/upload/' + flag)
}

// Shorthand helpers sized for the places we use covers.
export const thumbUrl = (url) => optimizeCloudinaryUrl(url, 200)  // track list / mini player
export const cardUrl  = (url) => optimizeCloudinaryUrl(url, 400)  // album card
export const heroUrl  = (url) => optimizeCloudinaryUrl(url, 800)  // album hero / full-screen player

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

// Lightweight track projection for list endpoints — strips internal bookkeeping
// fields the client never uses to shrink the JSON payload (important with
// 100+ tracks). audioUrl stays so clicks can start playback instantly.
export const LIST_PROJECTION = {
  _id: 1,
  title: 1,
  artistId: 1,
  artistName: 1,
  genreId: 1,
  genreName: 1,
  audioUrl: 1,
  coverImage: 1,
  album: 1,
  duration: 1,
  order: 1,
  active: 1,
}
