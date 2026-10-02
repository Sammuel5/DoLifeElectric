import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import Music from '@/models/Music'
import Genre from '@/models/Genre'
import { deleteFromCloudinary } from '@/lib/cloudinary'
import { decorateTrack, DEFAULT_TRACK_COVER } from '@/lib/covers'
import mongoose from 'mongoose'
export const dynamic = 'force-dynamic'

function sanitizeObjectId(id) {
  if (!id || id === '' || id === 'undefined' || id === 'null') return null
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id)
  return null
}

export async function GET(req, { params }) {
  try {
    await dbConnect()
    const track = await Music.findById(params.id)
    if (!track) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    let genre = null
    if (track.genreId) genre = await Genre.findById(track.genreId).lean()
    const map = genre ? new Map([[String(genre._id), genre]]) : new Map()
    return NextResponse.json(decorateTrack(track, map))
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
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

    let genreDoc = null
    if ('genreId' in data) {
      data.genreId = sanitizeObjectId(data.genreId)
      if (data.genreId) {
        const g = await Genre.findById(data.genreId)
        data.genreName = g ? g.name : ''
        if (!g) data.genreId = null
        else genreDoc = g
      } else {
        data.genreName = ''
      }
    }

    if (data.audioUrl) {
      const existing = await Music.findById(params.id)
      if (existing?.audioUrl && existing.audioUrl !== data.audioUrl && existing.audioPublicId) {
        try { await deleteFromCloudinary(existing.audioPublicId) } catch (_) {}
      }
    }

    const track = await Music.findByIdAndUpdate(
      params.id,
      { $set: data },
      { new: true, runValidators: true }
    )
    if (!track) return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    if (!genreDoc && track.genreId) genreDoc = await Genre.findById(track.genreId)
    const gObj = genreDoc ? (genreDoc.toObject ? genreDoc.toObject() : genreDoc) : null
    const out = decorateTrack(track, gObj ? new Map([[String(gObj._id), gObj]]) : new Map())
    return NextResponse.json(out)
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
    if (removed.audioPublicId) {
      try { await deleteFromCloudinary(removed.audioPublicId) } catch (_) {}
    }
    if (removed.coverPublicId) {
      try {
        const shared = await Music.countDocuments({ coverImage: removed.coverImage, _id: { $ne: removed._id } })
        if (shared === 0) await deleteFromCloudinary(removed.coverPublicId)
      } catch (_) {}
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
