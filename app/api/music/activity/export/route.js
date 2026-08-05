import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import TrackActivity from '@/models/TrackActivity'
import 'server-only'

export const dynamic = 'force-dynamic'

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function dateCell(d) {
  if (!d) return '<td></td>'
  const dt = d instanceof Date ? d : new Date(d)
  if (isNaN(dt.getTime())) return '<td></td>'
  const pad = n => String(n).padStart(2, '0')
  return `<td style="mso-number-format:\\@">${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}</td>`
}

function timeCell(d) {
  if (!d) return '<td></td>'
  const dt = d instanceof Date ? d : new Date(d)
  if (isNaN(dt.getTime())) return '<td></td>'
  const pad = n => String(n).padStart(2, '0')
  return `<td style="mso-number-format:\\@">${pad(dt.getHours())}:${pad(dt.getMinutes())}</td>`
}

export async function GET(req) {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.allowed) return auth.error

    await dbConnect()
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'all'
    const search = (searchParams.get('search') || '').trim()

    const query = {}
    if (type === 'play' || type === 'download') query.activityType = type
    if (search) {
      const q = search.toLowerCase()
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      query.$or = [
        { userName: regex },
        { userEmail: regex },
        { trackTitle: regex },
        { artistName: regex },
      ]
    }

    const activities = await TrackActivity.find(query)
      .sort({ createdAt: -1 })
      .limit(20000)
      .lean()

    const dateStamp = new Date().toISOString().slice(0, 10)
    const typeSuffix = type === 'play' ? '-plays' : type === 'download' ? '-downloads' : ''
    const filename = `DLE-Music-Activity-${dateStamp}${typeSuffix}.xls`

    const countPlays = activities.filter(a => a.activityType === 'play').length
    const countDownloads = activities.filter(a => a.activityType === 'download').length
    const uniqueListeners = new Set(activities.map(a => (a.userEmail || '').toLowerCase()).filter(Boolean)).size

    const headers = ['Date','Time','Action','User Name','User Email','Track Title','Artist']

    const typeLabel = t => t === 'play' ? '▶ Listened (Play)' : t === 'download' ? '⬇ Downloaded' : t

    const rows = activities.map(a => {
      return `<tr>${[
        dateCell(a.createdAt),
        timeCell(a.createdAt),
        `<td>${escapeHtml(typeLabel(a.activityType))}</td>`,
        `<td>${escapeHtml(a.userName || '')}</td>`,
        `<td style="mso-number-format:\\@">${escapeHtml(a.userEmail || '')}</td>`,
        `<td>${escapeHtml(a.trackTitle || '')}</td>`,
        `<td>${escapeHtml(a.artistName || '')}</td>`,
      ].join('')}</tr>`
    }).join('')

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
                         xmlns:x="urn:schemas-microsoft-com:office:excel"
                         xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<!--[if gte mso 9]>
<xml>
  <x:ExcelWorkbook>
    <x:ExcelWorksheets>
      <x:ExcelWorksheet>
        <x:Name>Music Activity${typeSuffix ? ' ('+escapeHtml(typeSuffix.slice(1))+')' : ''}</x:Name>
        <x:WorksheetOptions>
          <x:FreezePanes/><x:FrozenNoSplit/>
          <x:SplitHorizontal>1</x:SplitHorizontal>
          <x:TopRowBottomPane>1</x:TopRowBottomPane>
          <x:ActivePane>2</x:ActivePane>
        </x:WorksheetOptions>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  table { border-collapse: collapse; }
  th { background: #1a1a1a; color: #C9A84C; font-family: Calibri, sans-serif; font-size: 11pt; font-weight: bold; padding: 6px 8px; text-align: left; border: 1px solid #333; }
  td { font-family: Calibri, sans-serif; font-size: 11pt; padding: 4px 8px; border: 1px solid #ddd; }
  tr:nth-child(even) td { background: #f9f6ec; }
  .summary td { background: #fff8e1; font-weight: bold; color: #8b6f1a; border-top: 2px solid #C9A84C; }
</style>
</head>
<body>
<table>
  <thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr class="summary"><td colspan="6" style="text-align:right">Total Plays:</td><td>${countPlays}</td></tr>
    <tr class="summary"><td colspan="6" style="text-align:right">Total Downloads:</td><td>${countDownloads}</td></tr>
    <tr class="summary"><td colspan="6" style="text-align:right">Unique Listeners:</td><td>${uniqueListeners}</td></tr>
  </tfoot>
</table>
</body></html>`

    return new NextResponse('\uFEFF' + html, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
