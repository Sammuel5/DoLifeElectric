// Server-only module — must never be imported by a client component.
import 'server-only'

// Mongoose connector for DLE Entertainment.
//
// DNS fix: on Windows, antivirus/VPN/Hyper-V can leave a dead DNS proxy at
// 127.0.0.1 which breaks MongoDB's mongodb+srv:// SRV lookups via Node's
// c-ares resolver. We use dns-preload.cjs (root level, loaded via CJS require
// behind a Node-runtime guard so webpack doesn't try to bundle it for Edge)
// which forces public DNS + installs a DNS-over-HTTPS monkey-patch for SRV/TXT
// + exports an OS-resolver (getaddrinfo) lookup function for A/AAAA.

import mongoose from 'mongoose'

// Lazy-load the DNS fix (only in Node.js server runtime)
let _dnsFix = null
function getDnsFix() {
  if (_dnsFix) return _dnsFix
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== 'nodejs') {
    // Edge runtime — no Node DNS module. Return no-op stubs (this branch
    // is only reached in Edge builds where DB calls are never actually made).
    _dnsFix = {
      mongoDnsLookup: undefined,
      whenDnsReady:   () => Promise.resolve(),
    }
    return _dnsFix
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  _dnsFix = require('../dns-preload.cjs')
  return _dnsFix
}

// ---------------------------------------------------------------------------
// MongoDB configuration
// ---------------------------------------------------------------------------

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = 'DoLifeElectric'

// ---------------------------------------------------------------------------
// Connection timeouts (tight — healthy Atlas TLS connects in <1s)
// ---------------------------------------------------------------------------

const CONNECT_TIMEOUT_MS = 10_000
const SERVER_SELECTION_MS = 10_000
const SOCKET_TIMEOUT_MS = 30_000
const WAIT_QUEUE_TIMEOUT_MS = 10_000

// ---------------------------------------------------------------------------
// Circuit breaker: if a connection attempt fails, refuse to retry for this
// long. Prevents every page load from hanging 10s when DB is unreachable.
// ---------------------------------------------------------------------------

const FAILURE_COOLDOWN_MS = 45_000

if (!global.__dleDbState) {
  global.__dleDbState = {
    lastFailureAt: 0,
    lastErrorMsg: '',
    loggedCooldown: false,
  }
}
const state = global.__dleDbState

// ---------------------------------------------------------------------------
// Global Mongoose cache (prevents duplicate connections on hot reload)
// ---------------------------------------------------------------------------

if (!global.__dleMongoose) {
  global.__dleMongoose = { conn: null, promise: null }
}
const cached = global.__dleMongoose

// ---------------------------------------------------------------------------
// Database unavailable error
// ---------------------------------------------------------------------------

class DbUnavailableError extends Error {
  constructor(message) {
    super(message || 'Database is temporarily unavailable')
    this.name = 'DbUnavailableError'
  }
}

// ---------------------------------------------------------------------------
// MongoDB connection
// ---------------------------------------------------------------------------

async function dbConnect() {
  if (!MONGODB_URI) {
    throw new DbUnavailableError(
      'Database not configured. Please set MONGODB_URI in your environment variables.'
    )
  }

  // Circuit OPEN: fail immediately without waiting for network timeout.
  const now = Date.now()
  if (!cached.conn && state.lastFailureAt && (now - state.lastFailureAt) < FAILURE_COOLDOWN_MS) {
    if (!state.loggedCooldown) {
      const waitSec = Math.round((FAILURE_COOLDOWN_MS - (now - state.lastFailureAt)) / 1000)
      console.warn(
        `⚠ DB circuit OPEN (${state.lastErrorMsg}). Skipping connection for ${waitSec}s. App works in JWT/read-only fallback mode.`
      )
      state.loggedCooldown = true
      setTimeout(() => { state.loggedCooldown = false }, FAILURE_COOLDOWN_MS)
    }
    throw new DbUnavailableError('Database temporarily unreachable (circuit open)')
  }

  if (!MONGODB_URI.startsWith('mongodb+srv://') && !MONGODB_URI.startsWith('mongodb://')) {
    console.warn('⚠ MONGODB_URI protocol looks wrong — should start with mongodb+srv:// or mongodb://')
  }

  // Return existing healthy connection
  if (cached.conn) {
    if (cached.conn.connection.readyState === 1) {
      return cached.conn
    }
    // Stale connection — drop it
    cached.conn = null
    cached.promise = null
  }

  // Share an in-flight connection promise across concurrent callers
  if (cached.promise) {
    try {
      cached.conn = await cached.promise
      return cached.conn
    } catch (error) {
      cached.promise = null
      cached.conn = null
      throw error
    }
  }

  // Ensure DNS fix (including async DoH monkey-patch) is fully installed
  // before any MongoDB SRV lookup fires.
  const fix = getDnsFix()
  await fix.whenDnsReady()

  console.log(`⏳ Connecting to MongoDB database "${DB_NAME}"...`)

  const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
  // Serverless (Vercel): tiny pool so we don't exhaust Atlas connections across
  // many concurrent lambdas; each lambda is short-lived.
  // Dev/local: slightly larger pool for hot-reload parallelism.
  const maxPoolSize = isServerless ? 3 : 5

  const options = {
    dbName: DB_NAME,
    bufferCommands: false,
    serverSelectionTimeoutMS: SERVER_SELECTION_MS,
    connectTimeoutMS: CONNECT_TIMEOUT_MS,
    socketTimeoutMS: SOCKET_TIMEOUT_MS,
    waitQueueTimeoutMS: WAIT_QUEUE_TIMEOUT_MS,
    family: 4,
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
    retryWrites: true,
    maxPoolSize,
    minPoolSize: 0,
    autoIndex: false,
    // Use Windows OS resolver (dns.lookup) instead of c-ares for host
    // resolution. c-ares fails on Windows PCs where antivirus/VPN blocks
    // raw UDP DNS; dns.lookup uses getaddrinfo() which works reliably.
    // On non-Windows this is undefined (default c-ares behavior).
    lookup: fix.mongoDnsLookup,
  }

  cached.promise = mongoose
    .connect(MONGODB_URI, options)
    .then((mongooseInstance) => {
      cached.conn = mongooseInstance
      state.lastFailureAt = 0
      state.lastErrorMsg = ''
      state.loggedCooldown = false
      console.log('🟢 MongoDB connected successfully')
      console.log(`🟢 Database: "${mongooseInstance.connection.name}"`)
      console.log(`🟢 Host: ${mongooseInstance.connection.host}`)
      return mongooseInstance
    })
    .catch((error) => {
      cached.promise = null
      cached.conn = null
      state.lastFailureAt = Date.now()
      state.lastErrorMsg = error?.message || String(error)
      state.loggedCooldown = false
      console.error('🔴 MongoDB connection FAILED:', state.lastErrorMsg)
      console.error(`🔴 Database features (artists/music/donations) will NOT work. Retrying in ${Math.round(FAILURE_COOLDOWN_MS / 1000)}s.`)
      console.error('🔴 Run  `node test-db.js`  in the project folder to diagnose DNS/TCP/TLS issues.')
      console.error('🔴 If you see SSL/tlsv1 errors, disable "HTTPS/SSL scanning" in your antivirus.')
      throw error
    })

  try {
    cached.conn = await cached.promise
    return cached.conn
  } catch (error) {
    cached.promise = null
    cached.conn = null
    throw new DbUnavailableError(
      `Unable to connect to MongoDB: ${error?.message || String(error)}`
    )
  }
}

export default dbConnect
export { DbUnavailableError }
