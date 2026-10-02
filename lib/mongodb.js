// MongoDB native driver client (used by NextAuth session callbacks).
// Server-only module — must never be imported by a client component.
import 'server-only'

import { MongoClient } from 'mongodb'

// Lazy-load the DNS fix (only in Node.js server runtime)
let _dnsFix = null
function getDnsFix() {
  if (_dnsFix) return _dnsFix
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== 'nodejs') {
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

const uri = process.env.MONGODB_URI

const FAILURE_COOLDOWN_MS = 45_000
const CONNECT_TIMEOUT_MS  = 10_000

// Share circuit-breaker state with the Mongoose connector (same DB, same fate).
if (!global.__dleDbState) {
  global.__dleDbState = { lastFailureAt: 0, lastErrorMsg: '', loggedCooldown: false }
}
const state = global.__dleDbState

if (!uri) {
  console.warn('⚠ MONGODB_URI not set in .env.local. Running without database.')
}

function buildClient(uriStr) {
  const fix = getDnsFix()
  return new MongoClient(uriStr, {
    serverSelectionTimeoutMS: CONNECT_TIMEOUT_MS,
    connectTimeoutMS:         CONNECT_TIMEOUT_MS,
    socketTimeoutMS:          30_000,
    waitQueueTimeoutMS:       CONNECT_TIMEOUT_MS,
    family: 4,
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames:   false,
    retryWrites: true,
    // Use Windows OS resolver (dns.lookup) instead of c-ares — works on
    // PCs where antivirus/VPN blocks raw UDP DNS. Undefined on non-Windows
    // (uses driver default).
    lookup: fix.mongoDnsLookup,
    ...(uriStr.includes('directConnection=true') ? { directConnection: true } : {}),
  })
}

function buildClientPromise() {
  const fix = getDnsFix()
  return fix.whenDnsReady().then(() => {
    if (!uri) return null
    const client = buildClient(uri)
    return client.connect()
      .then(c => {
        console.log('🟢 MongoDB (NextAuth client) connected')
        state.lastFailureAt = 0
        state.lastErrorMsg  = ''
        state.loggedCooldown = false
        return c
      })
      .catch(err => {
        state.lastFailureAt = Date.now()
        state.lastErrorMsg  = err.message || String(err)
        state.loggedCooldown = false
        console.warn('⚠ MongoDB (NextAuth client) connection FAILED:', state.lastErrorMsg)
        console.warn('⚠ Auth uses JWT sessions — sign-in still works; DB features disabled.')
        console.warn('⚠ Run  `node test-db.js`  to diagnose DNS/TCP/TLS issues.')
        if (process.env.NODE_ENV === 'development') {
          global._mongoClientPromise = null
        }
        return null
      })
  })
}

let clientPromise = null

if (!uri) {
  clientPromise = Promise.resolve(null)
} else if (process.env.NODE_ENV === 'development') {
  // In dev, cache a promise that races connection vs timeout so we don't
  // hang sign-in if the DB is unreachable.
  if (!global._mongoClientPromise) {
    const connectPromise = buildClientPromise()
    const timeoutPromise = new Promise(resolve => {
      setTimeout(() => {
        if (!state.lastFailureAt) {
          state.lastFailureAt = Date.now()
          state.lastErrorMsg  = `timeout after ${CONNECT_TIMEOUT_MS}ms`
        }
        console.warn(`⚠ MongoDB (NextAuth client) timed out after ${CONNECT_TIMEOUT_MS}ms — JWT fallback active.`)
        global._mongoClientPromise = null
        resolve(null)
      }, CONNECT_TIMEOUT_MS)
    })
    global._mongoClientPromise = Promise.race([connectPromise, timeoutPromise])
  }
  clientPromise = global._mongoClientPromise
} else {
  clientPromise = buildClientPromise()
}

// Respects shared circuit breaker.
async function getClient() {
  if (!uri) return null
  const now = Date.now()
  if (state.lastFailureAt && (now - state.lastFailureAt) < FAILURE_COOLDOWN_MS) {
    return null
  }
  if (process.env.NODE_ENV === 'development' && !global._mongoClientPromise) {
    global._mongoClientPromise = buildClientPromise()
  }
  return clientPromise
}

export default getClient
