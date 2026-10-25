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
  // Inject f_auto,q_auto (+ w_<width>) into the /upload/ segment if not already there.
  // NOTE: we use q_auto:good (not q_auto:best) and fl_progressive so Cloudinary
  // serves the image quickly on first-hit rather than spending seconds re-encoding
  // a "best" derivative. This is the main fix for new users seeing broken images
  // while Cloudinary on-the-fly generates a fresh transform.
  const has = /\/upload\/(?:[^/]+,)*?f_auto/.test(url)
  if (has) return url
  const transforms = ['f_auto', 'q_auto:good', 'fl_progressive']
  if (width) transforms.push(`w_${width}`, 'c_scale')
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

/**
 * Turn an artist/group name into a stable URL/filename slug that matches the
 * public_id we'll use when uploading thank-you videos to Cloudinary.
 *   "ZENYX" → "zenyx"
 *   "Game Changer PH" → "game-changer-ph"
 *   "Bini, The" → handled naturally (we lowercase + hyphenate alphanumerics only).
 */
export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')        // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')             // non-alnum → hyphen
    .replace(/^-+|-+$/g, '')                 // trim leading/trailing hyphens
}

/**
 * Tiered thank-you videos.
 *
 * After a fan pays, the thank-you content varies by:
 *   1. WHO they gifted
 *      - GROUP (isGroup=true)  → personal group thank-you video
 *      - SOLO ARTIST / GENERAL → tiered video (high/mid/low) based on amount
 *   2. HOW MUCH they paid (PHP pesos)
 *      - HIGH:  ≥ ₱500  → "big supporter" cinematic thank-you
 *      - MID:   ₱100–₱499 → "medium thank-you" video
 *      - LOW:   < ₱100  → text card (or low-tier video if you upload one)
 *
 * Upload convention (Cloudinary ROOT of cloud "paffrkre" — same place where
 * home-montage.mp4 and home-montage-mobile.mp4 live; no subfolder prefix):
 *
 *   SOLO ARTISTS (3 shared videos, same for every solo artist):
 *     tier-high.mp4                         → HIGH tier (≥ ₱500)
 *     tier-mid.mp4                          → MID tier (₱100–₱499)
 *     tier-low.mp4                          → LOW tier (₱1–99; optional — falls
 *                                              back to text card if missing)
 *
 *   GROUPS (1 personal video per group):
 *     <group-slug>.mp4                      → e.g. zenyx.mp4
 *                                              e.g. game-changer-ph.mp4
 *
 *   dle.mp4                                → Optional brand-default video
 *                                              (fallback if the primary video is
 *                                              missing); if missing too, the
 *                                              text card shows.
 *
 * Fallback chain (what gets tried in order):
 *   GROUPS:  <group-slug>.mp4  →  dle.mp4  →  text card
 *   SOLO:    tier-<level>.mp4  →  dle.mp4  →  next tier down  →  text card
 *
 * Examples:
 *   Fan gifts ₱1000 to ZENYX (group)       → plays zenyx.mp4 (never tier videos)
 *   Fan gifts ₱20 to Envy (solo)           → text card (or tier-low.mp4)
 *   Fan gifts ₱250 to Envy (solo)          → plays tier-mid.mp4
 *   Fan gifts ₱700 to Sam (solo)           → plays tier-high.mp4
 *   Fan gifts ₱1000 "General" (no artist)  → plays tier-high.mp4
 *
 * Thresholds (PHP pesos) — adjust here if you want different breakpoints.
 */
export const TIER_THRESHOLDS = {
  high: 500,   // >= ₱500 → high tier
  mid:  100,   // >= ₱100 and < ₱500 → mid tier; < ₱100 → low
}

export function getThankYouTier(amountPesos) {
  const n = Number(amountPesos) || 0
  if (n >= TIER_THRESHOLDS.high) return 'high'
  if (n >= TIER_THRESHOLDS.mid)  return 'mid'
  return 'low'
}

/**
 * Build the Cloudinary URL for a thank-you video given the target asset basename
 * (e.g. "zenyx", "tier-high", "dle"). Returns null-form local dev fallback if
 * Cloudinary isn't configured.
 *
 * NOTE: Thank-you videos live at the ROOT of cloud "paffrkre" — the SAME
 * level where home-montage.mp4 and home-montage-mobile.mp4 are stored (NOT
 * inside dle-entertainment/videos/, NOT inside a thanks/ subfolder).
 * Upload instructions are in THANKS_VIDEOS_SETUP.md.
 */
/**
 * Build a single thank-you video URL.
 *
 * In LOCAL DEVELOPMENT (NODE_ENV !== 'production') we prioritize LOCAL files
 * in /public/uploads/thanks/<name>.mp4 so you can test by dropping MP4s into
 * that folder without uploading to Cloudinary first.
 *
 * In PRODUCTION we only use Cloudinary (Vercel's filesystem is read-only in
 * production — /public is baked into the build so you can't upload new videos
 * without a redeploy, which is why Cloudinary is the production source).
 *
 * @param source 'local' | 'cloudinary' — force which source to use. When omitted,
 *   local is returned if running in dev AND the file is expected to exist
 *   (we can't check existence from the browser, so we just return local and
 *   let ThankYouModal's error-fallback chain handle 404s).
 */
export function thankYouAssetUrl(basename, { width = 960, bitrateKbps = 900, source } = {}) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME
  const safeName = slugify(basename)
  if (!safeName) return null

  const isDev = process.env.NODE_ENV !== 'production'
  const useLocal = source === 'local' || (source !== 'cloudinary' && isDev)
  if (useLocal) {
    return `/uploads/thanks/${safeName}.mp4`
  }
  if (!cloudName) return `/uploads/thanks/${safeName}.mp4`
  const transforms = [
    'f_mp4',
    'q_auto:good',
    'vc_h264:baseline:3.0',
    `vs_${width}`,
    `br_${bitrateKbps}k`,
    'ac_aac',
    'ab_96k',
  ].join(',')
  return `https://res.cloudinary.com/${cloudName}/video/upload/${transforms}/${safeName}.mp4`
}

/**
 * Helper that returns candidate URLs for a single basename in priority order.
 * In dev: local first, then cloudinary (so you can test local files; cloudinary
 * acts as a fallback if you've already uploaded to production).
 * In prod: cloudinary only (no local files baked in for thank-yous).
 */
function assetUrls(basename) {
  const safe = slugify(basename)
  if (!safe) return []
  const isDev = process.env.NODE_ENV !== 'production'
  const urls = []
  if (isDev) urls.push(thankYouAssetUrl(safe, { source: 'local' }))
  urls.push(thankYouAssetUrl(safe, { source: 'cloudinary' }))
  return urls
}

/**
 * Given (artist, amountPesos), return a list of candidate URLs to try in
 * priority order. The ThankYouModal will try each URL in turn and fall back
 * to the next if the previous 404s / fails to load. Last fallback is the
 * text card for low tier.
 *
 * Returns { mode: 'video'|'animation', candidates: string[] }
 *   - 'video' mode means try all candidate videos; if ALL fail, drop to animation
 *   - 'animation' means play text card immediately (no video to try)
 */
export function thankYouVideoCandidates(artist, amountPesos) {
  const isGroup = !!artist?.isGroup
  const artistSlug = slugify(artist?.name)
  const tier = getThankYouTier(amountPesos)
  const urls = []
  const push = (base) => { for (const u of assetUrls(base)) urls.push(u) }

  if (isGroup && artistSlug) {
    // GROUP: one personal thank-you video per group (e.g. zenyx.mp4).
    // Fallback order: group video → dle brand video → text card.
    // We deliberately DO NOT fall back to tier-high/mid/low here — those are
    // solo-artist tier videos and would confuse fans with a "Gold Supporter"
    // style message meant for solo donations.
    push(artistSlug)
    push('dle')
    return { mode: 'video', candidates: urls.filter(Boolean), tier: 'group', artistSlug }
  }

  // SOLO / GENERAL — all solo artists share the same 3 tier videos
  if (tier === 'high') {
    push('tier-high')
    push('dle')
    // Fall through to mid if high video missing
    push('tier-mid')
    return { mode: 'video', candidates: urls.filter(Boolean), tier, artistSlug }
  }

  if (tier === 'mid') {
    push('tier-mid')
    push('dle')
    // Fall through to low if mid missing
    push('tier-low')
    return { mode: 'video', candidates: urls.filter(Boolean), tier, artistSlug }
  }

  // LOW tier — try low video first; fall back through mid/high/dle videos.
  // If ALL videos are missing, the modal shows a minimal "Thank You" text card
  // (no mascot/bunny — just cinematic gold typography on black).
  push('tier-low')
  push('tier-mid')
  push('dle')
  push('tier-high')
  return { mode: 'video', candidates: urls.filter(Boolean), tier, artistSlug }
}

// Backward-compat alias (older code calls thankYouVideoUrl directly)
export function thankYouVideoUrl(slugOrName, opts) {
  return thankYouAssetUrl(slugOrName, opts)
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
