import { NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import Artist from '@/models/Artist'

// Debug endpoint to verify group memberships
export async function GET() {
  try {
    await dbConnect()
    const artists = await Artist.find({ active: true }).sort({ createdAt: -1 })
    const groups = artists.filter(a => a.isGroup).map(g => ({
      _id: String(g._id),
      name: g.name,
      members: artists.filter(m => m.groupId && String(m.groupId) === String(g._id)).map(m => ({
        _id: String(m._id),
        name: m.name,
      })),
    }))
    return NextResponse.json({
      totalArtists: artists.length,
      totalGroups: groups.length,
      totalUnassigned: artists.filter(a => !a.isGroup && !a.groupId).length,
      groups,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
