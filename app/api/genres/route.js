import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import Genre from '@/models/Genre'
import Music from '@/models/Music'
export const dynamic = 'force-dynamic'

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Public: list active genres with track counts
export async function GET() {
  try {
    await dbConnect()
    const genres = await Genre.find({ active: true }).sort({ order: 1, name: 1 })

    // Attach track counts for each genre
    const ids = genres.map(g => g._id)
    const counts = await Music.aggregate([
      { $match: { active: true, genreId: { $in: ids } } },
      { $group: { _id: '$genreId', count: { $sum: 1 } } },
    ])
    const countMap = new Map(counts.map(c => [c._id.toString(), c.count]))

    const payload = genres.map(g => ({
      _id: g._id,
      name: g.name,
      slug: g.slug || slugify(g.name),
      description: g.description || '',
      color: g.color || '',
      order: g.order || 0,
      trackCount: countMap.get(g._id.toString()) || 0,
    }))

    return NextResponse.json(payload)
  } catch (e) {
    return NextResponse.json([])
  }
}

// Admin: create genre (music permission required)
export async function POST(req) {
  try {
    const auth = await requirePermission('music')
    if (!auth.allowed) return auth.error
    await dbConnect()
    const data = await req.json().catch(() => ({}))

    if (!data.name || !data.name.trim()) {
      return NextResponse.json({ error: 'Genre name is required' }, { status: 400 })
    }

    // Duplicate check (case-insensitive)
    const escaped = data.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const existing = await Genre.findOne({
      name: { $regex: new RegExp(`^${escaped}$`, 'i') },
    })
    if (existing) {
      return NextResponse.json(
        { error: `A genre named "${data.name}" already exists.`, duplicate: true },
        { status: 409 }
      )
    }

    const genre = await Genre.create({
      name: data.name.trim(),
      slug: data.slug || slugify(data.name),
      description: (data.description || '').trim(),
      color: (data.color || '').trim(),
      order: Number(data.order) || 0,
      active: data.active !== false,
    })
    return NextResponse.json(genre)
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed to create genre' }, { status: 500 })
  }
}
