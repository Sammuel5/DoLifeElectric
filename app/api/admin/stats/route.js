import { NextResponse } from 'next/server'
import { requireAnyAdmin, norm, SUPER_ADMIN } from '@/lib/auth'
import dbConnect, { DbUnavailableError } from '@/lib/dbConnect'
import { isDbDownError } from '@/lib/dbSafe'
import Artist from '@/models/Artist'
import Music from '@/models/Music'
import Donation from '@/models/Donation'
import TrackActivity from '@/models/TrackActivity'
import Admin from '@/models/Admin'
import Genre from '@/models/Genre'
import 'server-only'

export const dynamic = 'force-dynamic'

// GET /api/admin/stats — aggregate dashboard numbers for the overview.
// Returns only the stats the caller is permitted to see.
export async function GET() {
  try {
    const auth = await requireAnyAdmin()
    if (!auth.allowed) return auth.error

    await dbConnect()

    const email = norm(auth.session.user.email)
    const isSuper = email === norm(SUPER_ADMIN) || auth.session.user?.isSuperAdmin
    const perms = auth.session.user?.permissions || {}
    const canArtists = isSuper || perms.artists !== false
    const canMusic = isSuper || perms.music === true
    const canDonations = isSuper || perms.donations === true
    const canAnalytics = isSuper || perms.analytics === true

    // Always-safe count queries, gated per permission.
    const queries = []
    if (canArtists) queries.push(Artist.countDocuments())
    if (canMusic) {
      queries.push(Music.countDocuments())
      queries.push(Genre.countDocuments({ active: true }))
    }
    if (canDonations) {
      queries.push(Donation.countDocuments())
      queries.push(
        Donation.aggregate([
          { $match: { status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
      )
    }
    if (canAnalytics) {
      queries.push(TrackActivity.countDocuments({ activityType: 'play' }))
      queries.push(TrackActivity.countDocuments({ activityType: 'download' }))
      queries.push(
        TrackActivity.distinct('userEmail', {
          userEmail: { $exists: true, $ne: '' },
          activityType: 'play',
        })
      )
    }
    if (isSuper) queries.push(Admin.countDocuments({ role: { $ne: 'super' } }))

    const results = await Promise.all(queries)
    let idx = 0

    const payload = { ok: true }
    if (canArtists) payload.artists = results[idx++] || 0
    if (canMusic) {
      payload.tracks = results[idx++] || 0
      payload.genres = results[idx++] || 0
    }
    if (canDonations) {
      payload.totalGifts = results[idx++] || 0
      const revenueAgg = results[idx++]
      payload.totalRevenue = (revenueAgg && revenueAgg[0] && revenueAgg[0].total) || 0
    }
    if (canAnalytics) {
      payload.totalPlays = results[idx++] || 0
      payload.totalDownloads = results[idx++] || 0
      const unique = results[idx++] || []
      payload.uniqueListeners = Array.isArray(unique) ? unique.length : 0
    }
    if (isSuper) payload.adminCount = results[idx++] || 0

    // Compute "last 7 days" plays for trend sparkline (analytics permitted users).
    if (canAnalytics) {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      sevenDaysAgo.setHours(0, 0, 0, 0)

      const recentPlays = await TrackActivity.aggregate([
        { $match: { activityType: 'play', createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: {
              y: { $year: '$createdAt' },
              m: { $month: '$createdAt' },
              d: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } },
      ])

      const recentDownloads = await TrackActivity.aggregate([
        { $match: { activityType: 'download', createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: {
              y: { $year: '$createdAt' },
              m: { $month: '$createdAt' },
              d: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } },
      ])

      // Build 7-day array for frontend sparkline.
      const sparkline = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        d.setHours(0, 0, 0, 0)
        const key = { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }
        const plays = recentPlays.find(
          (r) => r._id.y === key.y && r._id.m === key.m && r._id.d === key.d
        )
        const downs = recentDownloads.find(
          (r) => r._id.y === key.y && r._id.m === key.m && r._id.d === key.d
        )
        sparkline.push({
          date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
            d.getDate()
          ).padStart(2, '0')}`,
          label: d.toLocaleDateString('en-US', { weekday: 'short' }),
          plays: plays ? plays.count : 0,
          downloads: downs ? downs.count : 0,
        })
      }
      payload.sparkline = sparkline
      payload.playsLast7 = sparkline.reduce((s, x) => s + x.plays, 0)
      payload.downloadsLast7 = sparkline.reduce((s, x) => s + x.downloads, 0)
    }

    if (canDonations) {
      // Completed gifts last 30 days.
      const thirty = new Date()
      thirty.setDate(thirty.getDate() - 30)
      thirty.setHours(0, 0, 0, 0)
      const recentDonationsAgg = await Donation.aggregate([
        { $match: { status: 'completed', paidAt: { $gte: thirty } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ])
      const agg = recentDonationsAgg[0]
      payload.revenueLast30 = agg?.total || 0
      payload.giftsLast30 = agg?.count || 0
    }

    return NextResponse.json(payload)
  } catch (e) {
    if (isDbDownError(e)) {
      return NextResponse.json(
        { error: 'Database unavailable', dbDown: true, ok: false },
        { status: 503, headers: { 'x-db-down': '1' } }
      )
    }
    return NextResponse.json({ error: e.message, ok: false }, { status: 500 })
  }
}
