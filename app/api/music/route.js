import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import Music from '@/models/Music'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await dbConnect()
    const tracks = await Music.find({ active: true }).sort({ order: 1, createdAt: -1 })
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
    if (!data.artistName || data.artistName.trim() === '') data.artistName = 'DLE Entertainment'
    const track = await Music.create(data)
    return NextResponse.json(track)
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed to save track' }, { status: 500 })
  }
}
