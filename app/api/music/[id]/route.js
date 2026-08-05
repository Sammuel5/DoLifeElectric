import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import Music from '@/models/Music'
export const dynamic = 'force-dynamic'

export async function PUT(req, { params }) {
  try {
    const auth = await requirePermission('music')
    if (!auth.allowed) return auth.error
    await dbConnect()
    const data = await req.json().catch(() => ({}))
    if (!data.artistId || data.artistId === '' || data.artistId === 'undefined') data.artistId = null
    const track = await Music.findByIdAndUpdate(params.id, data, { new: true })
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
