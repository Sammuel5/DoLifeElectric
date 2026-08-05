import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, SUPER_ADMIN, norm } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import Donation from '@/models/Donation'
import 'server-only'

export const dynamic = 'force-dynamic'

// Generates an Excel-compatible .xls file (SpreadsheetML / HTML table)
// Excel, Google Sheets, Numbers, and LibreOffice all open these natively — no library needed.

const GIFT_LABELS = { food: 'Food', clothes: 'Clothes', gift: 'Gift', money: 'Cash' }

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function phpCell(amountCentavos) {
  const pesos = ((amountCentavos || 0) / 100).toFixed(2)
  // mso-number-format tells Excel to treat this as a number with ₱ currency symbol
  return `<td style="mso-number-format:&quot;₱&quot;\\#\\,\\#0\\.00">${pesos}</td>`
}

function dateCell(d) {
  if (!d) return '<td></td>'
  const dt = d instanceof Date ? d : new Date(d)
  if (isNaN(dt.getTime())) return '<td></td>'
  // Plain date (no time), forced as TEXT so Excel never converts to serial numbers
  const pad = n => String(n).padStart(2, '0')
  const y = dt.getFullYear()
  const mo = pad(dt.getMonth() + 1)
  const da = pad(dt.getDate())
  const text = `${y}-${mo}-${da}`
  return `<td style="mso-number-format:\\@">${text}</td>`
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const email = norm(session.user.email)
    const isOwner = email === norm(SUPER_ADMIN) || session.user.isSuperAdmin
    const canExport = isOwner || session.user.permissions?.donations === true
    if (!canExport) {
      return NextResponse.json({ error: 'Forbidden: you do not have export permission' }, { status: 403 })
    }

    await dbConnect()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'all'
    const search = (searchParams.get('search') || '').trim()
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    const query = {}
    if (status !== 'all') query.status = status
    if (start || end) {
      query.createdAt = {}
      if (start) query.createdAt.$gte = new Date(start)
      if (end) query.createdAt.$lte = new Date(end)
    }
    if (search) {
      const q = search.toLowerCase()
      const mongoose = await import('mongoose')
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      query.$or = [
        { userName: regex },
        { userEmail: regex },
        { artistName: regex },
        { message: regex },
        { paymongoReferenceNo: regex },
        { paymongoPaymentId: regex },
        { paymongoLinkId: regex },
      ]
    }

    const donations = await Donation.find(query).sort({ createdAt: -1 }).limit(10000).lean()

    const dateStamp = new Date().toISOString().slice(0, 10)
    const statusSuffix = status !== 'all' ? `-${status}` : ''
    const filename = `DLE-Gifts-${dateStamp}${statusSuffix}.xls`

    // Summary totals
    const totalCompleted = donations
      .filter(d => d.status === 'completed')
      .reduce((s, d) => s + (d.amount || 0), 0)
    const totalCompletedPHP = (totalCompleted / 100).toFixed(2)
    const countCompleted = donations.filter(d => d.status === 'completed').length
    const countPending = donations.filter(d => d.status === 'pending').length
    const countFailed = donations.filter(d => d.status === 'failed').length
    const countRefunded = donations.filter(d => d.status === 'refunded').length

    const headerCells = ['Date','Reference No','Payment ID','Status','Fan Name','Fan Email','Artist','Gift Type','Amount (PHP)','Payment Method','Message','Paid Date']

    const rows = donations.map(d => {
      const cells = [
        dateCell(d.createdAt),
        `<td style="mso-number-format:\\@">${escapeHtml(d.paymongoReferenceNo || d.metadata?.reference_number || '(pending)')}</td>`,
        `<td style="mso-number-format:\\@">${escapeHtml(d.paymongoPaymentId || '')}</td>`,
        `<td>${escapeHtml((d.status || '').charAt(0).toUpperCase() + (d.status || '').slice(1))}</td>`,
        `<td>${escapeHtml(d.userName || '')}</td>`,
        `<td>${escapeHtml(d.userEmail || '')}</td>`,
        `<td>${escapeHtml(d.artistName || '')}</td>`,
        `<td>${escapeHtml(GIFT_LABELS[d.giftType] || d.giftType || '')}</td>`,
        phpCell(d.amount),
        `<td>${escapeHtml(d.paymentMethod || '')}</td>`,
        `<td>${escapeHtml(d.message || '')}</td>`,
        dateCell(d.paidAt),
      ].join('')
      return `<tr>${cells}</tr>`
    }).join('')

    // Build HTML Excel file (SpreadsheetML)
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
        <x:Name>Gifts${status !== 'all' ? ' ('+escapeHtml(status)+')' : ''}</x:Name>
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
  .total td { font-size: 12pt; }
</style>
</head>
<body>
<table>
  <thead><tr>${headerCells.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr class="summary total"><td colspan="8" style="text-align:right">TOTAL COMPLETED:</td>${phpCell(totalCompleted)}<td colspan="3"></td></tr>
    <tr class="summary"><td colspan="8" style="text-align:right">Completed count:</td><td>${countCompleted}</td><td colspan="3"></td></tr>
    <tr class="summary"><td colspan="8" style="text-align:right">Pending:</td><td>${countPending}</td><td colspan="3"></td></tr>
    <tr class="summary"><td colspan="8" style="text-align:right">Failed:</td><td>${countFailed}</td><td colspan="3"></td></tr>
    <tr class="summary"><td colspan="8" style="text-align:right">Refunded:</td><td>${countRefunded}</td><td colspan="3"></td></tr>
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
