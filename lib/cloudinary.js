/**
 * Cloudinary uploader — server-only.
 *
 * When CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY +
 * CLOUDINARY_API_SECRET) is set in environment variables, all image/video/audio
 * uploads are streamed directly to Cloudinary and served from their global CDN
 * with automatic format (f_auto) and quality (q_auto) optimization.
 *
 * If Cloudinary env vars are NOT set, we fall back to local /public/uploads so
 * local dev still works without creating an account.
 *
 * NEVER import this from client components — it uses the API SECRET.
 */
import 'server-only'

let _v2 = null
let _configured = false
let _tried = false

function getCloudinary() {
  if (_tried) return _v2
  _tried = true
  try {
    // cloudinary v2 ships CJS; use a lazy require so it stays tree-shakable
    // for local dev that doesn't have it installed / not configured.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cloudinary = require('cloudinary')
    _v2 = cloudinary.v2
    // CLOUDINARY_URL is the easiest way (CLOUDINARY_URL=cloudinary://key:secret@cloud)
    // We also support separate vars for Vercel env var UX.
    if (process.env.CLOUDINARY_URL) {
      // configure automatically from CLOUDINARY_URL
    } else if (process.env.CLOUDINARY_CLOUD_NAME) {
      _v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key:    process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure:     true,
      })
    } else {
      _v2 = null
      return null
    }
    _configured = true
    return _v2
  } catch (_) {
    _v2 = null
    return null
  }
}

/**
 * Returns true if Cloudinary is configured and usable.
 */
export function isCloudinaryEnabled() {
  return !!getCloudinary()
}

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer} buffer - raw file bytes
 * @param {string} folder - logical folder: 'images' | 'audio' | 'videos'
 * @param {string} originalName - original filename (for public ID derivation)
 * @returns {Promise<{url: string, public_id: string, bytes: number, format: string, resource_type: 'image'|'video'|'raw'} | null>}
 */
export async function uploadToCloudinary(buffer, folder, originalName = 'upload') {
  const cld = getCloudinary()
  if (!cld) return null

  const resourceType =
    folder === 'videos' ? 'video' :
    folder === 'audio'  ? 'video' : // cloudinary treats audio under 'video' resource type
    'image'

  // Clean up name: strip extension, sanitize
  const safeName = (originalName || 'upload')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40) || 'file'

  // Choose transformation presets per folder
  const eager = resourceType === 'image'
    ? [
        // responsive sizes: thumbnail / card / large, auto-format/quality
        { width: 200,  height: 200,  crop: 'thumb',  gravity: 'auto', fetch_format: 'auto', quality: 'auto' },
        { width: 400,  height: 400,  crop: 'limit',  fetch_format: 'auto', quality: 'auto' },
        { width: 800,  height: 800,  crop: 'limit',  fetch_format: 'auto', quality: 'auto' },
        { width: 1280, height: 1280, crop: 'limit',  fetch_format: 'auto', quality: 'auto:good' },
      ]
    : resourceType === 'video'
    ? [
        { width: 1280, crop: 'limit', fetch_format: 'auto', quality: 'auto', streaming_profile: 'hd' },
      ]
    : []

  return new Promise((resolve) => {
    const uploadStream = cld.uploader.upload_stream(
      {
        folder: `dle-entertainment/${folder}`,
        public_id: `${Date.now()}-${safeName}`,
        resource_type: resourceType,
        type: 'upload',
        secure: true,
        eager,
        eager_async: false,
        overwrite: false,
        // Auto-moderation is optional; skipping for now.
      },
      (err, result) => {
        if (err || !result) {
          console.error('[cloudinary] Upload error:', err?.message || err)
          return resolve(null)
        }
        // Return the f_auto,q_auto URL so images are always served optimized
        const parts = result.secure_url.split('/')
        // Insert f_auto,q_auto transform into the URL after /upload/
        const uploadIdx = parts.indexOf('upload')
        if (uploadIdx !== -1 && resourceType === 'image') {
          parts.splice(uploadIdx + 1, 0, 'f_auto,q_auto')
        }
        resolve({
          url: parts.join('/'),
          public_id: result.public_id,
          bytes: result.bytes,
          format: result.format,
          resource_type: result.resource_type,
          width: result.width,
          height: result.height,
          duration: result.duration || null,
        })
      }
    )
    uploadStream.end(buffer)
  })
}

/**
 * Build an optimized URL for a Cloudinary public_id (helper for future use).
 */
export function buildOptimizedUrl(publicId, opts = {}) {
  const cld = getCloudinary()
  if (!cld) return publicId
  return cld.url(publicId, {
    secure: true,
    fetch_format: 'auto',
    quality: 'auto',
    ...opts,
  })
}
