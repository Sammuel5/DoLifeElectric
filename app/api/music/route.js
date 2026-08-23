import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import Music from '@/models/Music'
import Genre from '@/models/Genre'
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
    return NextResponse.json(tracks)
  } catch (e) {
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

    // Resolve genre
    data.genreId = sanitizeObjectId(data.genreId)
    if (data.genreId) {
      const g = await Genre.findById(data.genreId)
      data.genreName = g ? g.name : ''
      if (!g) data.genreId = null
    } else {
      data.genreName = ''
    }

    const track = await Music.create(data)
    return NextResponse.json(track)
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed to save track' }, { status: 500 })
  }
}
