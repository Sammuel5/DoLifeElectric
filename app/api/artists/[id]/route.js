import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import Artist from '@/models/Artist'
import mongoose from 'mongoose'
export const dynamic = 'force-dynamic'

function sanitizeGroupId(gid) {
  if (!gid || gid === '' || gid === 'undefined' || gid === 'null') return null
  if (mongoose.Types.ObjectId.isValid(gid)) return new mongoose.Types.ObjectId(gid)
  return null
}

export async function GET(_, { params }) {
  try {
    await dbConnect()
    const artist = await Artist.findById(params.id)
    if (!artist) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(artist)
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
