import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import Genre from '@/models/Genre'
import Music from '@/models/Music'
import { thumbUrl } from '@/lib/covers'
export const dynamic = 'force-dynamic'

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Public: list active genres with track counts and covers
export async function GET() {
  try {
    await dbConnect()
    // Project only fields we need so the response stays small at high genre counts.
    const genres = await Genre.find(
      { active: true },
      { name: 1, slug: 1, description: 1, color: 1, coverImage: 1, order: 1 }
    ).sort({ order: 1, name: 1 }).lean()

    // Attach track counts for each genre
    const ids = genres.map(g => g._id)
    const counts = ids.length > 0 ? await Music.aggregate([
      { $match: { active: true, genreId: { $in: ids } } },
      { $group: { _id: '$genreId', count: { $sum: 1 } } },
    ]) : []
    const countMap = new Map(counts.map(c => [c._id.toString(), c.count]))

    const payload = genres.map(g => ({
      _id: g._id,
      name: g.name,
      slug: g.slug || slugify(g.name),
      description: g.description || '',
      color: g.color || '',
      // Optimize Cloudinary cover to a 200px thumb (smaller = faster)
      coverImage: g.coverImage ? thumbUrl(g.coverImage) : '',
      order: g.order || 0,
      trackCount: countMap.get(g._id.toString()) || 0,
    }))

    // 60-second CDN/browser cache with stale-while-revalidate so repeat page
    // views don't re-query MongoDB on every navigation — genres rarely change.
    return new NextResponse(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (e) {
    console.error('[genres GET] error:', e)
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
    const escaped = data.name.trim().replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')
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
      coverImage: (data.coverImage || '').trim(),
      coverPublicId: (data.coverPublicId || '').trim(),
      order: Number(data.order) || 0,
      active: data.active !== false,
    })
    return NextResponse.json(genre)
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed to create genre' }, { status: 500 })
  }
}
