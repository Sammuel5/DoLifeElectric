import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import Music from '@/models/Music'
import Genre from '@/models/Genre'
import { decorateTrack } from '@/lib/covers'
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
    const tracks = await Music.find(filter).sort({ order: 1, createdAt: -1 })
    const genreIds = new Set()
    tracks.forEach(t => { if (t.genreId) genreIds.add(String(t.genreId)) })
    let genreMap = new Map()
    if (genreIds.size > 0) {
      const genres = await Genre.find({ _id: { $in: Array.from(genreIds) } }).lean()
      genreMap = new Map(genres.map(g => [String(g._id), g]))
    }
    const out = tracks.map(t => decorateTrack(t, genreMap))
    return NextResponse.json(out)
  } catch (e) {
    console.error('[music GET] error:', e)
    return NextResponse.json([])
  }
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
