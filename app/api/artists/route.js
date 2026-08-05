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

export async function GET() {
  try {
    await dbConnect()
    const artists = await Artist.find({ active: true }).sort({ order: 1, createdAt: -1 })
    return NextResponse.json(artists)
  } catch (_) {
    return NextResponse.json([])
  }
}

export async function POST(req) {
  try {
    const auth = await requirePermission('artists')
    if (!auth.allowed) return auth.error
    await dbConnect()
    const data = await req.json().catch(() => ({}))
    const { forceCreate = false } = data

    if (data.name && !forceCreate) {
      const escapedName = data.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const existing = await Artist.findOne({
        name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
        active: true,
      })
      if (existing) {
        return NextResponse.json(
          { error: `An artist named "${data.name}" already exists. Do you still want to add?`, duplicate: true },
          { status: 409 }
        )
      }
    }

    if ('groupId' in data) {
      data.groupId = sanitizeGroupId(data.groupId)
    }
    if (data.isGroup) {
      data.groupId = null
    }
    delete data.forceCreate

    const artist = await Artist.create(data)
    return NextResponse.json(artist)
  } catch (e) {
    console.error('[artist POST] Error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
