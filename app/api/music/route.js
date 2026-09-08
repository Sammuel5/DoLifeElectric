import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import Music from '@/models/Music'
import Genre from '@/models/Genre'
import { decorateTrack, LIST_PROJECTION, thumbUrl, optimizeCloudinaryUrl } from '@/lib/covers'
import mongoose from 'mongoose'
export const dynamic = 'force-dynamic'

function sanitizeObjectId(id) {
  if (!id || id === '' || id === 'undefined' || id === 'null') return null
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id)
  return null
}

export async function GET(req) {
  try {
    await dbConnect()
    const { searchParams } = new URL(req.url)
    const genreId = searchParams.get('genre')
    const filter = { active: true }
    const gid = sanitizeObjectId(genreId)
    if (gid) filter.genreId = gid
    // Use projection to skip fields the client never renders (audioPublicId,
    // coverPublicId, coverStorage, audioStorage, createdAt, updatedAt, __v)
    // — this shrinks the payload and the DB work significantly at 100+ tracks.
    const tracks = await Music.find(filter, LIST_PROJECTION).sort({ order: 1, createdAt: -1 }).lean()
    const genreIds = new Set()
    tracks.forEach(t => { if (t.genreId) genreIds.add(String(t.genreId)) })
    let genreMap = new Map()
    if (genreIds.size > 0) {
      // Also project genre fields to only what we need.
      const genres = await Genre.find(
        { _id: { $in: Array.from(genreIds) } },
        { name: 1, slug: 1, color: 1, coverImage: 1, order: 1, active: 1 }
      ).lean()
      genreMap = new Map(genres.map(g => [String(g._id), g]))
    }
    const out = tracks.map(t => {
      const decorated = decorateTrack(t, genreMap)
      // Pre-optimize Cloudinary cover URLs so the browser gets tiny WebP thumbs
      // instead of multi-megabyte originals. This is THE BIGGEST win with
      // 100+ tracks — album cards were previously loading full-size 2000px+
      // images for every song.
      if (decorated.coverImage) decorated.coverImage = thumbUrl(decorated.coverImage)
      if (decorated.effectiveCover && decorated.effectiveCover !== decorated.coverImage) {
        decorated.effectiveCover = thumbUrl(decorated.effectiveCover)
      }
      if (decorated.genreCover) decorated.genreCover = thumbUrl(decorated.genreCover)
      // For Cloudinary audio URLs, inject q_auto / ac_aac so streaming starts
      // faster and the browser gets an AAC-encoded byte-stream that supports
      // range requests (seek) well. No effect on local /uploads/ URLs.
      if (decorated.audioUrl) {
        decorated.audioUrl = optimizeCloudinaryAudio(decorated.audioUrl)
      }
      return decorated
    })
    // 60-second CDN cache + SWR so reloads/navigations don't hit Mongo every
    // time but stay reasonably fresh after admin uploads/edits.
    return new NextResponse(JSON.stringify(out), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (e) {
    console.error('[music GET] error:', e)
    return NextResponse.json([])
  }
}

// Rewrite a Cloudinary audio URL to add streaming-friendly transforms:
//   - ac_aac  → re-encode on-the-fly to AAC (fastest-starting web format)
//   - q_auto  → let Cloudinary pick bitrate
// Non-Cloudinary URLs pass through untouched.
function optimizeCloudinaryAudio(url) {
  if (!url || typeof url !== 'string') return url
  if (url.startsWith('/') || url.startsWith('data:')) return url
  if (!/res\.cloudinary\.com|cloudinary\.com\//.test(url)) return url
  if (/\/upload\/(?:[^/]+,)*?ac_aac/.test(url)) return url // already done
  return url.replace('/upload/', '/upload/q_auto,ac_aac/')
}

export async function POST(req) {
  try {
    const auth = await requirePermission('music')
    if (!auth.allowed) return auth.error
    await dbConnect()
    const data = await req.json().catch(() => ({}))

    if (!data.artistId || data.artistId === '' || data.artistId === 'undefined') data.artistId = null
    else data.artistId = sanitizeObjectId(data.artistId)

    if (!data.artistName || data.artistName.trim() === '') data.artistName = 'DLE Entertainment'

    data.genreId = sanitizeObjectId(data.genreId)
    let genreDoc = null
    if (data.genreId) {
      const g = await Genre.findById(data.genreId)
      data.genreName = g ? g.name : ''
      if (!g) data.genreId = null
      else genreDoc = g
    } else {
      data.genreName = ''
    }

    const track = await Music.create(data)
    const out = decorateTrack(track, genreDoc ? new Map([[String(genreDoc._id), genreDoc.toObject ? genreDoc.toObject() : genreDoc]]) : new Map())
    return NextResponse.json(out)
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed to save track' }, { status: 500 })
  }
}
