import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { uploadToCloudinary, isCloudinaryEnabled } from '@/lib/cloudinary'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

export async function POST(req) {
  try {
    let formData
    try {
      formData = await req.formData()
    } catch (_) {
      return NextResponse.json({ error: 'Failed to parse upload.' }, { status: 400 })
    }

    const folder = formData.get('folder') || 'images'

    // audio upload requires 'music' permission; images/videos require 'artists' permission
    const perm = folder === 'audio' ? 'music' : 'artists'
    const auth = await requirePermission(perm)
    if (!auth.allowed) return auth.error

    const file = formData.get('file')
    if (!file) {
      return NextResponse.json({ error: 'No file received. Make sure you selected a file.' }, { status: 400 })
    }

    const maxSizes = {
      images: 10 * 1024 * 1024,
      audio: 80 * 1024 * 1024,
      videos: 200 * 1024 * 1024,
    }
    const maxSize = maxSizes[folder] || 10 * 1024 * 1024
    if (file.size && file.size > maxSize) {
      const sizeMB = Math.round(maxSize / 1024 / 1024)
      return NextResponse.json({ error: `File too large. Maximum for ${folder} is ${sizeMB}MB.` }, { status: 400 })
    }

    let buffer
    try {
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } catch (bufErr) {
      console.error('[upload] Buffer conversion error:', bufErr)
      return NextResponse.json({ error: 'Could not read file. Try again.' }, { status: 500 })
    }

    const originalName = file.name || 'upload.bin'
    const ext = (path.extname(originalName) || '').toLowerCase()
    const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)

    // Whitelist of SAFE extensions per folder
    const allowedExts = {
      images: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
      audio:  ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'],
      videos: ['.mp4', '.webm', '.mov', '.m4v'],
    }
    const allowed = allowedExts[folder] || allowedExts.images
    if (!allowed.includes(ext)) {
      return NextResponse.json(
        { error: `Invalid file type "${ext}". Allowed for ${folder}: ${allowed.join(', ')}` },
        { status: 400 }
      )
    }

    const mime = (file.type || '').toLowerCase()
    const mimeOk =
      (folder === 'images' && mime.startsWith('image/') && mime !== 'image/svg+xml') ||
      (folder === 'audio'  && mime.startsWith('audio/')) ||
      (folder === 'videos' && mime.startsWith('video/'))
    if (!mimeOk && mime !== '') {
      return NextResponse.json({ error: `File type (${mime || 'unknown'}) does not match ${folder} folder.` }, { status: 400 })
    }

    // ──── Try Cloudinary first (fast global CDN, works on Vercel) ────
    if (isCloudinaryEnabled()) {
      try {
        const result = await uploadToCloudinary(buffer, folder, originalName)
        if (result) {
          console.log(`[upload] Cloudinary OK: ${result.public_id} (${result.bytes} bytes) by ${auth.session.user.email} — ${result.resource_type}`)
          return NextResponse.json({
            url: result.url,
            filename: originalName,
            size: result.bytes,
            cdn: 'cloudinary',
            public_id: result.public_id,
            width: result.width || null,
            height: result.height || null,
            duration: result.duration || null,
            format: result.format || null,
          })
        }
      } catch (cldErr) {
        console.error('[upload] Cloudinary failed, falling back to local:', cldErr.message)
      }
    }

    // ──── LOCAL FALLBACK (dev / no Cloudinary) ────
    const filename = `${Date.now()}-${baseName}${ext}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder)
    try {
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true })
      }
      await writeFile(path.join(uploadDir, filename), buffer)
    } catch (writeErr) {
      console.error('[upload] Write error:', writeErr)
      return NextResponse.json({
<<<<<<< HEAD
        error: `Uploads only work when running locally (localhost). On Vercel the server filesystem is read-only — run \`npm run dev\` on your PC and upload there, then push the public/uploads/ folder to GitHub so Vercel serves it as a static file.`,
=======
        error: isCloudinaryEnabled()
          ? `Upload failed: ${writeErr.message}`
          : `Could not save file on Vercel's read-only filesystem. Configure Cloudinary in env vars to fix this.`,
        hint: !isCloudinaryEnabled() ? 'Set CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET) in Vercel env vars.' : undefined,
>>>>>>> cfd5b4ebe8fe11dfb3f28192674430d268414e55
      }, { status: 500 })
    }

    const publicUrl = `/uploads/${folder}/${filename}`
    console.log(`[upload] Local OK: ${publicUrl} (${buffer.length} bytes) by ${auth.session.user.email}`)
    return NextResponse.json({
      url: publicUrl,
      filename,
      size: buffer.length,
      cdn: 'local',
    })
  } catch (e) {
    console.error('[upload] Unexpected error:', e)
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 })
  }
}
