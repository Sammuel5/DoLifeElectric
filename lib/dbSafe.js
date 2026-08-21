import "server-only"
import { NextResponse } from 'next/server'
import dbConnect, { DbUnavailableError } from './dbConnect'

const DB_ERROR_RE = /(timed out after|circuit open|MongooseServerSelection|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|tlsv1 alert|SSL routines|MongoNetworkError|server selection timed out|buffering timed out|Database not configured|Database temporarily unreachable)/i

export function isDbDownError(e) {
  if (!e) return false
  if (e instanceof DbUnavailableError) return true
  const msg = (e?.message || e?.name || '') + ''
  return DB_ERROR_RE.test(msg)
}

// Shared helper for API routes: when the DB is down (circuit open), respond
// with a consistent 503 + empty payload shape so the admin UI renders empty
// states instead of error toasts.
//
//   return dbSafe(async () => {
//     await dbConnect()
//     const items = await SomeModel.find({})
//     return NextResponse.json(items)
//   }, () => NextResponse.json([], { status: 503, headers: { 'x-db-down': '1' } }))
//
export async function dbSafe(handler, onDbDown) {
  try {
    return await handler()
  } catch (e) {
    if (isDbDownError(e)) {
      console.warn('DB unavailable in API route:', (e.message || '').slice(0, 160))
      if (onDbDown) return onDbDown(e)
      return NextResponse.json(
        { error: 'Database temporarily unavailable', dbDown: true },
        { status: 503, headers: { 'x-db-down': '1' } }
      )
    }
    return NextResponse.json(
      { error: e?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Quick helper: connect to DB and return null gracefully if DB is down (instead
// of throwing). Useful in situations where you can render a partial result.
export async function tryDbConnect() {
  try {
    if (!process.env.MONGODB_URI) return null
    return await dbConnect()
  } catch (e) {
    if (isDbDownError(e)) return null
    throw e
  }
}
