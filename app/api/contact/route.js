import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Please sign in with Google to send a message.' },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { name, email, subject, message } = body

    const trustedEmail = session.user.email
    const trustedName = (name && String(name).trim().slice(0, 100)) || session.user.name || trustedEmail
    const replyTo = (email && String(email).trim()) || trustedEmail
    const cleanSubject = subject ? String(subject).slice(0, 200) : ''
    const cleanMessage = message ? String(message).slice(0, 5000) : ''

    if (!cleanMessage) {
      return NextResponse.json({ error: 'Please enter a message.' }, { status: 400 })
    }

    const toEmail = process.env.CONTACT_EMAIL || 'info@dle-entertainment.com'
    const subjectLine = `[DLE Website] ${cleanSubject || 'Contact from ' + trustedName}`
    const replyToNote = replyTo !== trustedEmail ? `<p><strong>Entered reply-to:</strong> ${escapeHtml(replyTo)}</p>` : ''
    const textBody = `From: ${trustedName} <${trustedEmail}>\n${replyTo !== trustedEmail ? `Reply-to: ${replyTo}\n` : ''}\n${cleanMessage}`
    const htmlBody = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#C9A84C;border-bottom:2px solid #C9A84C;padding-bottom:8px">
          New message from DLE Entertainment website
        </h2>
        <p><strong>Name:</strong> ${escapeHtml(trustedName)}</p>
        <p><strong>Email:</strong> <a href="mailto:${encodeURIComponent(trustedEmail)}">${escapeHtml(trustedEmail)}</a></p>
        ${replyToNote}
        <p><strong>Subject:</strong> ${escapeHtml(cleanSubject || '(none)')}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="white-space:pre-wrap;line-height:1.5">${escapeHtml(cleanMessage)}</p>
      </div>
    `

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromAddress = process.env.EMAIL_FROM || 'onboarding@resend.dev'

      const { data, error } = await resend.emails.send({
        from: `DLE Website <${fromAddress}>`,
        to: [toEmail],
        replyTo: trustedEmail,
        subject: subjectLine,
        text: textBody,
        html: htmlBody,
      })

      if (error) {
        return NextResponse.json(
          { error: 'Email provider error: ' + (error.message || JSON.stringify(error)) },
          { status: 500 }
        )
      }
      return NextResponse.json({ success: true, provider: 'resend', id: data?.id })
    }

    if (process.env.EMAIL_SERVER_HOST && process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD) {
      const nodemailer = (await import('nodemailer')).default
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
        secure: String(process.env.EMAIL_SERVER_SECURE || 'false') === 'true',
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      })
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER,
        to: toEmail,
        replyTo: trustedEmail,
        subject: subjectLine,
        text: textBody,
        html: htmlBody,
      })
      return NextResponse.json({ success: true, provider: 'smtp' })
    }

    return NextResponse.json(
      { error: 'Email is not configured. Set RESEND_API_KEY or SMTP variables in .env.local.' },
      { status: 500 }
    )
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
