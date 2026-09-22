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

// Transform a Cloudinary video URL (res.cloudinary.com/.../upload/...) to stream
// a bandwidth-friendly H.264 MP4 perfect for website hero backgrounds.
//   - vc_h264:baseline → widest device compatibility (phones + old iPhones)
//   - vs_<width>        → cap resolution (720p desktop, 480p/720p mobile)
//   - br_<k>            → cap bitrate (~1.5M desktop, 800k mobile)
//   - ac_none           → strip audio track (hero is muted; saves ~128kbps)
//   - f_mp4             → MP4 container
//   - q_auto            → auto quality
// Non-Cloudinary URLs pass through untouched.
// Shorthand helpers sized for the places we use covers.
export const thumbUrl = (url) => optimizeCloudinaryUrl(url, 200)  // track list / mini player
export const cardUrl  = (url) => optimizeCloudinaryUrl(url, 400)  // album card / artist portrait
export const heroUrl  = (url) => optimizeCloudinaryUrl(url, 800)  // album hero / full-screen player

// Optimize a Cloudinary video for streaming:
//   Desktop hero: 1280w, 1.5Mbps, H.264 baseline, no audio
//   Mobile hero:   720w, 800Kbps, same profile
// Non-Cloudinary / local URLs pass through untouched.
export function optimizeCloudinaryVideo(url, { width = 1280, bitrateKbps = 1500 } = {}) {
  if (!url || typeof url !== 'string') return url
  if (url.startsWith('/') || url.startsWith('data:')) return url
  if (!/res\.cloudinary\.com|cloudinary\.com\//.test(url)) return url
  if (!/\/video\/upload\//.test(url)) return url
  if (/\/upload\/(?:[^/]+,)*?vc_h264/.test(url)) return url
  const flags = [
    'f_mp4',
    'q_auto:good',
    'vc_h264:baseline:3.0',
    `vs_${width}`,
    `br_${bitrateKbps}k`,
    'ac_none',
  ].join(',') + '/'
  return url.replace('/video/upload/', '/video/upload/' + flags)
}

// Build a Cloudinary video URL for a manually-uploaded hero video.
// The cloud name is NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME. The folder prefix is
// configurable via NEXT_PUBLIC_CLOUDINARY_FOLDER:
//   - Leave it UNSET / empty to serve videos from the root of your Media Library
//     (public_id = "home-montage", "/home-montage.mp4" in URL)
//   - Set to "dle"               → dle/videos/home-montage.mp4
//   - Set to "dle-entertainment" → dle-entertainment/videos/home-montage.mp4
// Returns the /uploads/... local path if Cloudinary is not configured
// (local dev fallback).
export function heroVideoUrl(basename, { width = 1280, bitrateKbps = 1500 } = {}) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME
  const folderPrefix = (process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER || process.env.CLOUDINARY_FOLDER || '').trim()
  if (!cloudName) {
    return `/uploads/videos/${basename}`
  }
  const transforms = [
    'f_mp4',
    'q_auto:good',
    'vc_h264:baseline:3.0',
    `vs_${width}`,
    `br_${bitrateKbps}k`,
    'ac_none',
  ].join(',')
  // If a folder prefix is set, videos are expected under <prefix>/videos/ (e.g. dle-entertainment/videos/...).
  // If empty, videos are at the Media Library root (e.g. /home-montage.mp4).
  const folderPath = folderPrefix ? `${folderPrefix}/videos/` : ''
  return `https://res.cloudinary.com/${cloudName}/video/upload/${transforms}/${folderPath}${basename}`
}

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
