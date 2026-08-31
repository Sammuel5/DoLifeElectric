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

    // Map folder to required permission. `announcements` folder uses the
    // `announcements` permission (granted in Admin schema below).
    // `genres` folder (genre cover images) uses the `music` permission.
    const folderPermMap = {
      audio: 'music',
      images: 'artists',
      videos: 'artists',
      genres: 'music',
      announcements: 'announcements',
    }
    const perm = folderPermMap[folder] || 'artists'
    const auth = await requirePermission(perm)
    if (!auth.allowed) return auth.error

    const file = formData.get('file')
    if (!file) {
      return NextResponse.json({ error: 'No file received. Make sure you selected a file.' }, { status: 400 })
    }

    const maxSizes = {
      images: 10 * 1024 * 1024,
      audio: 50 * 1024 * 1024,
      videos: 100 * 1024 * 1024,
      genres: 10 * 1024 * 1024, // genre cover images (10MB)
      announcements: 20 * 1024 * 1024, // 20MB — covers large posters + short videos
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

    // Optional subfolder under the chosen `folder`
    const rawSubfolder = (formData.get('subfolder') || '').toString()
    let subfolder = ''
    if (rawSubfolder) {
      const cleaned = rawSubfolder
        .replace(/[\\/]/g, '')
        .replace(/\.+/g, '')
        .replace(/[^a-zA-Z0-9_\- .]/g, '_')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60)
      if (cleaned && cleaned !== '.' && cleaned !== '..') {
        subfolder = cleaned
      }
    }

    // Whitelist of SAFE extensions per folder
    const allowedExts = {
      images:         ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
      audio:          ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'],
      videos:         ['.mp4', '.webm', '.mov', '.m4v'],
      genres:         ['.jpg', '.jpeg', '.png', '.webp', '.gif'], // genre cover images
      announcements:  ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mov'],
    }
    const allowed = allowedExts[folder] || allowedExts.images
    if (!allowed.includes(ext)) {
      return NextResponse.json(
        { error: `Invalid file type "${ext}". Allowed for ${folder}: ${allowed.join(', ')}` },
        { status: 400 }
      )
    }
    const mime = (file.type || '').toLowerCase()
    const isVideo = folder === 'videos' || (folder === 'announcements' && mime.startsWith('video/')) || ['.mp4', '.webm', '.mov', '.m4v'].includes(ext)
    const isAudio = folder === 'audio'
    // Genres folder is always images
    const isImage = !isVideo && !isAudio && (folder === 'images' || folder === 'genres' || mime.startsWith('image/'))
    const mimeOk =
      (isImage && mime.startsWith('image/') && mime !== 'image/svg+xml') ||
      (isAudio && mime.startsWith('audio/')) ||
      (isVideo && mime.startsWith('video/'))
    if (!mimeOk && mime !== '') {
      return NextResponse.json({ error: `File type (${mime || 'unknown'}) does not match ${folder} folder.` }, { status: 400 })
    }

    // ---------------- CLOUDINARY PATH (production) ----------------
    if (isCloudinaryEnabled()) {
      try {
        // Pick the correct Cloudinary resource folder based on file content
        const cloudFolder = isVideo ? 'videos' : isAudio ? 'audio' : 'images'
        // Compute subfolder:
        //   - announcements → announcements
        //   - genres → genres (genre cover images live in dle/images/genres/)
        //   - audio/images with an explicit subfolder (genre name) → use it
        //     (e.g. audio → dle/audio/Hip-Hop/...  images → dle/images/Hip-Hop/...)
        let cloudSub = ''
        if (folder === 'announcements') cloudSub = 'announcements'
        else if (folder === 'genres') cloudSub = 'genres'
        else if (subfolder) cloudSub = subfolder
        const result = await uploadToCloudinary(buffer, {
          folder: cloudFolder,
          subfolder: cloudSub,
          filename: originalName,
        })
        if (result?.url) {
          console.log(`[upload] Cloudinary success: ${result.public_id} (${result.bytes} bytes) by ${auth.session.user.email}`)
          return NextResponse.json({
            url: result.url,
            public_id: result.public_id,
            filename: originalName,
            size: result.bytes,
            storage: 'cloudinary',
            mediaType: isVideo ? 'video' : isAudio ? 'audio' : 'image',
          })
        }
      } catch (cErr) {
        console.error('[upload] Cloudinary upload failed, falling back to local:', cErr.message)
        // fall through to local
      }
    }

    // ---------------- LOCAL PATH (dev / fallback) ----------------
    const filename = `${Date.now()}-${baseName}${ext}`

    // Genres folder gets its own top-level uploads/genres/ dir.
    // If a subfolder (genre name) is provided, nest under it (e.g. uploads/audio/Hip-Hop/).
    const localFolder = folder === 'genres' ? 'genres' : folder
    const targetFolder = subfolder
      ? path.join(process.cwd(), 'public', 'uploads', localFolder, subfolder)
      : path.join(process.cwd(), 'public', 'uploads', localFolder)

    const uploadsRoot = path.join(process.cwd(), 'public', 'uploads')
    const resolved = path.resolve(targetFolder)
    if (!resolved.startsWith(path.resolve(uploadsRoot) + path.sep) && resolved !== path.resolve(uploadsRoot)) {
      return NextResponse.json({ error: 'Invalid subfolder path.' }, { status: 400 })
    }

    try {
      if (!existsSync(targetFolder)) {
        await mkdir(targetFolder, { recursive: true })
      }
      await writeFile(path.join(targetFolder, filename), buffer)
    } catch (writeErr) {
      console.error('[upload] Write error:', writeErr)
      // On EROFS (Vercel), give a friendly message pointing at Cloudinary
      const isReadonly = writeErr && (writeErr.code === 'EROFS' || /read-only/i.test(writeErr.message || ''))
      if (isReadonly) {
        return NextResponse.json({
          error: 'Vercel production has a read-only filesystem. Configure Cloudinary (CLOUDINARY_URL) in Environment Variables to enable uploads there. See the Cloudinary tutorial for step-by-step setup.',
          code: 'EROFS',
        }, { status: 500 })
      }
      return NextResponse.json({ error: `Could not save file: ${writeErr.message}` }, { status: 500 })
    }

    const publicUrl = subfolder
      ? `/uploads/${localFolder}/${subfolder}/${filename}`
      : `/uploads/${localFolder}/${filename}`
    console.log(`[upload] Local success: ${publicUrl} (${buffer.length} bytes) by ${auth.session.user.email}`)
    return NextResponse.json({
      url: publicUrl,
      filename,
      size: buffer.length,
      storage: 'local',
      mediaType: isVideo ? 'video' : isAudio ? 'audio' : 'image',
    })
  } catch (e) {
    console.error('[upload] Unexpected error:', e)
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 })
  }
}
