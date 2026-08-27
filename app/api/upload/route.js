import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

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
      audio: 50 * 1024 * 1024,
      videos: 100 * 1024 * 1024,
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

    // Optional subfolder under the chosen `folder` (e.g. group name for images).
    // Sanitize to a safe folder name: letters, digits, dash, underscore, dot; max 60 chars.
    // We DO NOT allow path separators — the API will silently strip them and refuse anything that
    // tries to escape the uploads root (../, etc.).
    const rawSubfolder = (formData.get('subfolder') || '').toString()
    let subfolder = ''
    if (rawSubfolder) {
      // Strip path separators, then keep only safe chars
      const cleaned = rawSubfolder
        .replace(/[\\/]/g, '')                       // no slashes at all
        .replace(/\.\.+/g, '')                       // no ".."
        .replace(/[^a-zA-Z0-9_\- .]/g, '_')          // only safe chars
        .replace(/\s+/g, ' ')                        // collapse whitespace
        .trim()
        .slice(0, 60)
      // Disallow "." and ".." as the final segment
      if (cleaned && cleaned !== '.' && cleaned !== '..') {
        subfolder = cleaned
      }
    }

    // Whitelist of SAFE extensions per folder — block executable/script/SVG/HTML files
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
    // Also validate MIME type matches extension family
    const mime = (file.type || '').toLowerCase()
    const mimeOk =
      (folder === 'images' && mime.startsWith('image/') && mime !== 'image/svg+xml') ||
      (folder === 'audio'  && mime.startsWith('audio/')) ||
      (folder === 'videos' && mime.startsWith('video/'))
    if (!mimeOk && mime !== '') {
      // Don't block on empty mime (some browsers skip it), but block obviously wrong types
      return NextResponse.json({ error: `File type (${mime || 'unknown'}) does not match ${folder} folder.` }, { status: 400 })
    }

    const filename = `${Date.now()}-${baseName}${ext}`

    // Build the destination: public/uploads/{folder}/{subfolder?}/{filename}
    // subfolder is only used for the 'images' folder (and 'videos' / 'audio' if explicitly provided)
    // to avoid weird folder names in audio/videos which currently don't use subfolders.
    const useSubfolder = !!subfolder && (folder === 'images' || formData.get('subfolder') !== null)
    const targetFolder = useSubfolder
      ? path.join(process.cwd(), 'public', 'uploads', folder, subfolder)
      : path.join(process.cwd(), 'public', 'uploads', folder)

    // SAFETY: ensure the resolved target is still inside public/uploads (defense in depth)
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
      return NextResponse.json({
        error: `Could not save file: ${writeErr.message}. On Vercel production, use a cloud storage service like Cloudinary.`,
      }, { status: 500 })
    }

    // Build the public URL: include subfolder segment if used
    const publicUrl = useSubfolder
      ? `/uploads/${folder}/${subfolder}/${filename}`
      : `/uploads/${folder}/${filename}`
    console.log(`[upload] Success: ${publicUrl} (${buffer.length} bytes) by ${auth.session.user.email}`)
    return NextResponse.json({ url: publicUrl, filename, size: buffer.length })
  } catch (e) {
    console.error('[upload] Unexpected error:', e)
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 })
  }
}