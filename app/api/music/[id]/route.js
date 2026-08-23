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

export async function PUT(req, { params }) {
  try {
    const auth = await requirePermission('music')
    if (!auth.allowed) return auth.error
    await dbConnect()
    const data = await req.json().catch(() => ({}))

    if ('artistId' in data) {
      if (!data.artistId || data.artistId === '' || data.artistId === 'undefined') data.artistId = null
      else data.artistId = sanitizeObjectId(data.artistId)
    }

    // Resolve genre
    if ('genreId' in data) {
      data.genreId = sanitizeObjectId(data.genreId)
      if (data.genreId) {
        const g = await Genre.findById(data.genreId)
        data.genreName = g ? g.name : ''
        if (!g) data.genreId = null
      } else {
        data.genreName = ''
      }
    }

    const track = await Music.findByIdAndUpdate(
      params.id,
      { $set: data },
      { new: true, runValidators: true }
    )
    if (!track) return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    return NextResponse.json(track)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_, { params }) {
  try {
    const auth = await requirePermission('music')
    if (!auth.allowed) return auth.error
    await dbConnect()
    const removed = await Music.findByIdAndDelete(params.id)
    if (!removed) return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
