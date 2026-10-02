import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import Genre from '@/models/Genre'
import Music from '@/models/Music'
import { deleteFromCloudinary } from '@/lib/cloudinary'
import mongoose from 'mongoose'
export const dynamic = 'force-dynamic'

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function GET(_, { params }) {
  try {
    await dbConnect()
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    const genre = await Genre.findById(params.id)
    if (!genre) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(genre)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req, { params }) {
  try {
    const auth = await requirePermission('music')
    if (!auth.allowed) return auth.error
    await dbConnect()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const existing = await Genre.findById(params.id)
    if (!existing) return NextResponse.json({ error: 'Genre not found' }, { status: 404 })

    const data = await req.json().catch(() => ({}))

    // If renaming, check for duplicates against a different record
    let newName = existing.name
    if (data.name && data.name.trim()) {
      const trimmed = data.name.trim()
      const escaped = trimmed.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')
      const dup = await Genre.findOne({
        _id: { $ne: params.id },
        name: { $regex: new RegExp(`^${escaped}$`, 'i') },
      })
      if (dup) {
        return NextResponse.json(
          { error: `A genre named "${trimmed}" already exists.`, duplicate: true },
          { status: 409 }
        )
      }
      newName = trimmed
    }

    const update = { $set: {} }
    if ('name' in data) { update.$set.name = newName; update.$set.slug = data.slug || slugify(newName) }
    if ('slug' in data) update.$set.slug = data.slug || slugify(newName)
    if ('description' in data) update.$set.description = (data.description || '').trim()
    if ('color' in data) update.$set.color = (data.color || '').trim()
    if ('order' in data) update.$set.order = Number(data.order) || 0
    if ('active' in data) update.$set.active = !!data.active
    if ('coverImage' in data) update.$set.coverImage = (data.coverImage || '').trim()
    if ('coverPublicId' in data) update.$set.coverPublicId = (data.coverPublicId || '').trim()

    const genre = await Genre.findByIdAndUpdate(params.id, update, { new: true, runValidators: true })
    if (!genre) return NextResponse.json({ error: 'Genre not found' }, { status: 404 })

    // If genre was renamed, sync genreName on all tracks pointing to it
    if ('name' in data && newName !== existing.name) {
      await Music.updateMany({ genreId: genre._id }, { $set: { genreName: genre.name } })
    }

    return NextResponse.json(genre)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_, { params }) {
  try {
    const auth = await requirePermission('music')
    if (!auth.allowed) return auth.error
    await dbConnect()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const genre = await Genre.findById(params.id)
    if (!genre) return NextResponse.json({ error: 'Genre not found' }, { status: 404 })

    // Best-effort Cloudinary cleanup of the genre cover
    if (genre.coverPublicId) {
      try { await deleteFromCloudinary(genre.coverPublicId) } catch (_) {}
    }

    // Remove genre reference from any tracks in this genre (set to uncategorized)
    await Music.updateMany({ genreId: params.id }, { $set: { genreId: null, genreName: '' } })
    await Genre.findByIdAndDelete(params.id)

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
