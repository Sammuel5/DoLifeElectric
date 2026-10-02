import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import Artist from '@/models/Artist'
import { heroUrl } from '@/lib/covers'
import mongoose from 'mongoose'
// Individual artist detail (bio + video) — also CDN-cached for 60s. PUT/DELETE
// are mutations and bypass the cache automatically (they're non-GET).
export const revalidate = 60

function sanitizeGroupId(gid) {
  if (!gid || gid === '' || gid === 'undefined' || gid === 'null') return null
  if (mongoose.Types.ObjectId.isValid(gid)) return new mongoose.Types.ObjectId(gid)
  return null
}

export async function GET(_, { params }) {
  try {
    await dbConnect()
    // Also fetch members if it's a group (populate groupMembers lightweight).
    // Project out internal mongoose fields.
    const artist = await Artist.findById(params.id, {
      name: 1, title: 1, bio: 1, image: 1, videoUrl: 1,
      isGroup: 1, groupId: 1, groupMembers: 1, order: 1,
    }).lean()
    if (!artist) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // If it's a group, attach lightweight member info
    let members = []
    if (artist.isGroup && Array.isArray(artist.groupMembers) && artist.groupMembers.length) {
      members = await Artist.find(
        { _id: { $in: artist.groupMembers }, active: true },
        { name: 1, title: 1, image: 1, order: 1 }
      ).sort({ order: 1, name: 1 }).lean()
      members = members.map(m => ({
        _id: m._id,
        name: m.name,
        title: m.title || '',
        image: m.image ? heroUrl(m.image) : '',
      }))
    }

    const payload = {
      _id: artist._id,
      name: artist.name,
      title: artist.title || '',
      bio: artist.bio || '',
      image: artist.image ? heroUrl(artist.image) : '',
      videoUrl: artist.videoUrl || '',
      isGroup: !!artist.isGroup,
      groupId: artist.groupId || null,
      members,
    }

    return new NextResponse(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req, { params }) {
  try {
    const auth = await requirePermission('artists')
    if (!auth.allowed) return auth.error
    await dbConnect()
    const data = await req.json().catch(() => ({}))
    if ('groupId' in data) data.groupId = sanitizeGroupId(data.groupId)
    if (data.isGroup) data.groupId = null
    const artist = await Artist.findByIdAndUpdate(
      params.id,
      { $set: data },
      { new: true, runValidators: true }
    )
    if (!artist) return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    return NextResponse.json(artist)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_, { params }) {
  try {
    const auth = await requirePermission('artists')
    if (!auth.allowed) return auth.error
    await dbConnect()
    const artist = await Artist.findById(params.id)
    if (artist && artist.isGroup) {
      await Artist.updateMany({ groupId: params.id }, { $set: { groupId: null } })
    }
    await Artist.findByIdAndDelete(params.id)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
