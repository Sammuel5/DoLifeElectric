import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

export async function GET(req) {
  const { headers } = req
  const host = headers.get('host') || ''
  const forwarded = headers.get('x-forwarded-host') || ''
  const isLocal =
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1') ||
    forwarded.startsWith('localhost') ||
    forwarded.startsWith('127.0.0.1') ||
    process.env.NODE_ENV !== 'production'

  if (!isLocal) {
    return NextResponse.json({ ok: true, localOnly: true }, { status: 200 })
  }

  const ownerEmail = (process.env.OWNER_EMAIL || '').trim().toLowerCase()
  const hasAdminEmails = ADMIN_EMAILS.length > 0 || !!ownerEmail

  return NextResponse.json({
    mongodb: !!process.env.MONGODB_URI,
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    paymongo: !!process.env.PAYMONGO_SECRET_KEY,
    paymongoWebhook: !!process.env.PAYMONGO_WEBHOOK_SECRET,
    nextauthSecret: !!process.env.NEXTAUTH_SECRET,
    ownerEmail: !!ownerEmail,
    adminEmail: hasAdminEmails,
    email: !!(process.env.RESEND_API_KEY || (process.env.EMAIL_SERVER_HOST && process.env.EMAIL_SERVER_USER)),
    ok: !!(
      process.env.MONGODB_URI &&
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.PAYMONGO_SECRET_KEY &&
      process.env.NEXTAUTH_SECRET &&
      ownerEmail
    ),
  })
}
