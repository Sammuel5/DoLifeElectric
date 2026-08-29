/**
 * Cloudinary upload helper (server-only).
 *
 * If CLOUDINARY_URL or the individual CLOUDINARY_CLOUD_NAME /
 * CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET env vars are set, uploads go to
 * Cloudinary. If they are NOT set (e.g. running locally without an account),
 * all functions gracefully return `null` so callers can fall back to the
 * existing local filesystem upload. This makes Cloudinary strictly optional.
 *
 * On Vercel production you MUST configure Cloudinary because the filesystem is
 * read-only (EROFS). The local fallback will still error on Vercel — which is
 * expected.
 */
import 'server-only'
import { v2 as cloudinary } from 'cloudinary'

let configured = false
let hasCredentials = false

function init() {
  if (configured) return hasCredentials
  configured = true
  // Support either CLOUDINARY_URL (single-var config — what Cloudinary gives
  // you from the dashboard) OR the three individual vars.
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  const url = process.env.CLOUDINARY_URL
  if (url) {
    // CLOUDINARY_URL is in the form  cloudinary://<key>:<secret>@<cloud>
    cloudinary.config(url)
    hasCredentials = true
  } else if (cloudName && apiKey && apiSecret) {
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true })
    hasCredentials = true
  } else {
    hasCredentials = false
  }
  return hasCredentials
}

/**
 * Returns true if Cloudinary credentials are configured. Use this to skip
 * Cloudinary upload attempts when running locally without keys.
 */
export function isCloudinaryEnabled() {
  return init()
}

/**
 * Map our internal "folder" names (images / audio / videos) to a Cloudinary
 * resource_type + a sensible upload folder path.
 */
function resourceFor(folder = 'images') {
  if (folder === 'audio') return { resourceType: 'video', uploadFolder: 'dle/audio' }
  if (folder === 'videos') return { resourceType: 'video', uploadFolder: 'dle/videos' }
  return { resourceType: 'image', uploadFolder: 'dle/images' }
}

/**
 * Upload a buffer (the file the user submitted) to Cloudinary.
 *
 * @param {Buffer} buffer  File bytes
 * @param {object} opts
 * @param {string} opts.folder    'images' | 'audio' | 'videos'
 * @param {string} [opts.subfolder]  optional sub-path (sanitized by caller)
 * @param {string} [opts.filename]   original filename (used to build public_id)
 * @returns {Promise<{ url: string, public_id: string, bytes: number } | null>}
 *          null if Cloudinary is not configured.
 */
export async function uploadToCloudinary(buffer, { folder = 'images', subfolder = '', filename = 'upload' } = {}) {
  if (!init()) return null

  const { resourceType, uploadFolder } = resourceFor(folder)
  const safeName = (filename || 'upload')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 60)
  const publicId = [
    uploadFolder,
    ...(subfolder ? [subfolder.replace(/[^a-zA-Z0-9_\- .]/g, '_').trim().slice(0, 40)] : []),
    `${Date.now()}-${safeName}`,
  ].filter(Boolean).join('/')

  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        public_id: publicId,
        folder: undefined, // we baked folder into public_id
        overwrite: false,
        // images: auto-format + lossy compression for speed
        quality: folder === 'images' ? 'auto:good' : 'auto',
        fetch_format: folder === 'images' ? 'auto' : undefined,
      },
      (err, res) => {
        if (err) return reject(err)
        resolve(res)
      }
    ).end(buffer)
  })

  return {
    url: result.secure_url,
    public_id: result.public_id,
    bytes: result.bytes || buffer.length,
    resourceType,
  }
}

/**
 * Delete a previously uploaded asset by public_id. Used when an admin deletes
 * an announcement/track/artist that referenced a Cloudinary asset. Silent on
 * failure (we don't want to block the DB delete if Cloudinary hiccups).
 */
export async function deleteFromCloudinary(publicIdOrUrl) {
  if (!init() || !publicIdOrUrl) return false
  try {
    // If a full URL was passed, try to extract the public_id.
    let pid = publicIdOrUrl
    if (/^https?:/.test(publicIdOrUrl)) {
      // Typical Cloudinary URL: https://res.cloudinary.com/<cloud>/image/upload/v123/dle/images/foo.png
      const m = publicIdOrUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i)
      if (m) pid = m[1]
    }
    // Decide resource type from public_id prefix
    let resourceType = 'image'
    if (pid.startsWith('dle/audio/') || pid.startsWith('dle/videos/')) resourceType = 'video'
    await cloudinary.uploader.destroy(pid, { resource_type: resourceType })
    return true
  } catch (_) {
    return false
  }
}

export default cloudinary
