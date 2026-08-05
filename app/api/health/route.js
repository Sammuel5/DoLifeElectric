// Quick health check: visit http://localhost:3000/api/health to see if MongoDB is connected
import { NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  let dbStatus = 'disconnected'
  let dbName = null
  let error = null
  try {
    const mongoose = await dbConnect()
    if (mongoose.connection.readyState === 1) {
      dbStatus = 'connected'
      dbName = mongoose.connection.name
    } else {
      dbStatus = 'not_ready:' + mongoose.connection.readyState
    }
  } catch (e) {
    dbStatus = 'error'
    error = e.message
  }
  const elapsed = Date.now() - start
  return NextResponse.json({
    ok: dbStatus === 'connected',
    database: dbStatus,
    dbName,
    error,
    responseTimeMs: elapsed,
    nodeEnv: process.env.NODE_ENV,
    mongoDbUriConfigured: !!process.env.MONGODB_URI,
    tip: error ? 'Database unreachable — see terminal for logs. Try node test-db.js for diagnostics.' : null,
  })
}
