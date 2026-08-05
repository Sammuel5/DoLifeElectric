import { NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import mongoose from 'mongoose'

export async function GET() {
  // Check env var
  const uri = process.env.MONGODB_URI
  if (!uri) {
    return NextResponse.json({
      ok: false,
      error: 'MONGODB_URI is empty in .env.local',
      hint: 'Open .env.local and make sure MONGODB_URI=mongodb+srv://... is set with no quotes around it.'
    })
  }

  // Check format
  const issues = []
  if (!uri.startsWith('mongodb+srv://') && !uri.startsWith('mongodb://')) {
    issues.push('URI does not start with mongodb+srv:// or mongodb://')
  }
  if (uri.includes('<password>')) {
    issues.push('URI still contains the placeholder <password> — replace it with your actual database password')
  }
  if (uri.includes('<username>')) {
    issues.push('URI still contains the placeholder <username> — replace it with your actual database username')
  }
  if (uri.includes(' ')) {
    issues.push('URI contains spaces — make sure there are no spaces in the connection string')
  }
  if (uri.includes('"') || uri.includes("'")) {
    issues.push('URI contains quotes — do NOT wrap the value in quotes in .env.local')
  }
  // Check if database name is present
  const afterSlash = uri.split('@').pop()
  const partAfterHost = afterSlash?.split('/')[1]
  const dbName = partAfterHost?.split('?')[0]
  if (!dbName || dbName === '' || dbName.includes('mongodb.net')) {
    issues.push('Missing database name — add /DoLifeElectric before the ? in your URI')
  }

  if (issues.length > 0) {
    return NextResponse.json({ ok: false, error: 'URI format issues found', issues, hint: 'Example correct format: MONGODB_URI=mongodb+srv://dleadmin:yourpassword@cluster0.abc12.mongodb.net/DoLifeElectric?retryWrites=true&w=majority' })
  }

  // Try to connect
  try {
    await dbConnect()
    const state = mongoose.connection.readyState
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting']
    return NextResponse.json({
      ok: true,
      state: states[state] || 'unknown',
      dbName: mongoose.connection.name,
      host: mongoose.connection.host,
      message: '✅ Database connected successfully!'
    })
  } catch (e) {
    let hint = 'Unknown error'
    if (e.message.includes('bad auth') || e.message.includes('AuthenticationFailed')) {
      hint = 'Username/password is wrong. Check that you replaced <password> with the DATABASE USER password (not your Atlas login password). If your password contains special characters like @, :, /, #, ? you must URL-encode them.'
    } else if (e.message.includes('ENOTFOUND') || e.message.includes('querySrv')) {
      hint = 'Cannot reach MongoDB servers. Check the hostname in the URI matches what Atlas gave you.'
    } else if (e.message.includes('IP') || e.message.includes('whitelist') || e.message.includes('201.151') || e.message.includes('timed out')) {
      hint = 'IP address blocked. Go to MongoDB Atlas → Network Access → Add IP address → 0.0.0.0/0 (allow all) and save.'
    }
    return NextResponse.json({ ok: false, error: e.message, hint })
  }
}