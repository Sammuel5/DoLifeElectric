import "server-only";
// Apply DNS fix first (for Windows machines with broken c-ares DNS / DoH / VPN / AV)
import './dns-fix'
import mongoose from 'mongoose'
import { rewriteSrvUri } from './dns-fix'
import dns from "node:dns";

dns.setServers([
  "8.8.8.8",
  "1.1.1.1",
]);

const RAW_MONGODB_URI = process.env.MONGODB_URI
// Rewrite mongodb+srv:// → mongodb:// with explicit shard hosts so the driver
// never has to do SRV/TXT DNS lookups (which c-ares fails on many Windows AV setups).
const MONGODB_URI = RAW_MONGODB_URI ? rewriteSrvUri(RAW_MONGODB_URI) : RAW_MONGODB_URI
if (RAW_MONGODB_URI && RAW_MONGODB_URI !== MONGODB_URI) {
  console.log('🔧 Rewrote mongodb+srv:// URI to direct mongodb:// (Windows DNS compatibility)')
}

// ---------------------------------------------------------------------------
// Circuit breaker: if a connection attempt fails, refuse to retry immediately.
// This prevents every single page load from hanging for 30+ seconds when the
// database is unreachable (e.g. antivirus TLS interception on Windows).
// After FAILURE_COOLDOWN_MS we'll try again once; if it still fails we open
// the circuit for another cooldown window.
// ---------------------------------------------------------------------------
const FAILURE_COOLDOWN_MS = 45_000  // wait 45s between retries after a failure
const CONNECT_TIMEOUT_MS   =  4_000  // healthy Atlas TLS connects in <2s; longer means blocked
const SERVER_SELECTION_MS  =  4_000
const SOCKET_TIMEOUT_MS    = 30_000

if (!global.__dleDbState) {
  global.__dleDbState = {
    lastFailureAt: 0,
    lastErrorMsg: '',
    loggedCooldown: false,
  }
}
const state = global.__dleDbState

let cached = global.mongoose
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

class DbUnavailableError extends Error {
  constructor(msg) { super(msg || 'Database is temporarily unavailable'); this.name = 'DbUnavailableError' }
}

async function dbConnect() {
  if (!MONGODB_URI) {
    throw new DbUnavailableError(
      'Database not configured. Please set MONGODB_URI in your .env.local file. See TUTORIAL.md Step 1 for setup.'
    )
  }

  // If the circuit is OPEN (we failed recently) bail out immediately — no wait.
  const now = Date.now()
  if (!cached.conn && state.lastFailureAt && (now - state.lastFailureAt) < FAILURE_COOLDOWN_MS) {
    if (!state.loggedCooldown) {
      const waitSec = Math.round((FAILURE_COOLDOWN_MS - (now - state.lastFailureAt)) / 1000)
      console.warn(
        `⚠ DB circuit OPEN (${state.lastErrorMsg}). Skipping connection for ${waitSec}s. App works in JWT/read-only fallback mode.`
      )
      state.loggedCooldown = true
      // re-arm the log flag when cooldown expires
      setTimeout(() => { state.loggedCooldown = false }, FAILURE_COOLDOWN_MS)
    }
    throw new DbUnavailableError('Database temporarily unreachable (circuit open)')
  }

  if (cached.conn) {
    // If the cached connection died, drop it and reconnect once.
    if (cached.conn.connection.readyState === 1 /* connected */) return cached.conn
    cached.conn = null
    cached.promise = null
  }

  if (!cached.promise) {
    const DB_NAME = 'DoLifeElectric'
    console.log(`⏳ Connecting to MongoDB database "${DB_NAME}"...`)

    const opts = {
      dbName: DB_NAME,
      bufferCommands: false,
      serverSelectionTimeoutMS: SERVER_SELECTION_MS,
      connectTimeoutMS:         CONNECT_TIMEOUT_MS,
      socketTimeoutMS:          SOCKET_TIMEOUT_MS,
      waitQueueTimeoutMS:       CONNECT_TIMEOUT_MS,
      family: 4,                 // IPv4 first (Windows/IPv6 issues)
      tls: true,
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames:   false,
      // Retry writes helps Atlas topology changes; retry reads is on by default.
      retryWrites: true,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then(m => {
        console.log(`🟢 MongoDB connected → database: "${m.connection.name}" at ${m.connection.host}`)
        state.lastFailureAt = 0
        state.lastErrorMsg  = ''
        return m
      })
      .catch(err => {
        cached.promise = null           // allow a retry AFTER cooldown
        state.lastFailureAt = Date.now()
        state.lastErrorMsg  = err.message || String(err)
        state.loggedCooldown = false
        console.error('🔴 MongoDB connection FAILED:', state.lastErrorMsg)
        console.error(`🔴 Database features (artists/music/donations) will NOT work. Retrying in ${Math.round(FAILURE_COOLDOWN_MS/1000)}s.`)
        console.error('🔴 Run  `node test-db.js`  in the project folder to diagnose DNS/TCP/TLS issues.')
        console.error('🔴 (Most common Windows cause: antivirus HTTPS/TLS scanning blocking Atlas. Try temporarily disabling "HTTPS inspection" / "SSL scanning" in your antivirus.)')
        throw err
      })
  }

  cached.conn = await cached.promise
  return cached.conn
}

export default dbConnect
export { DbUnavailableError }
