import "server-only";
// Apply DNS fix first (for Windows machines with broken c-ares DNS / DoH / VPN / AV)
import './dns-fix'
import { MongoClient } from 'mongodb'
import { rewriteSrvUri } from './dns-fix'

const rawUri = process.env.MONGODB_URI
// Rewrite mongodb+srv:// to direct mongodb:// to bypass SRV/TXT DNS lookups entirely.
const uri = rawUri ? rewriteSrvUri(rawUri) : rawUri

const FAILURE_COOLDOWN_MS = 45_000
const CONNECT_TIMEOUT_MS  =  4_000

// Share circuit-breaker state with the Mongoose connector (same DB, same fate).
if (!global.__dleDbState) {
  global.__dleDbState = { lastFailureAt: 0, lastErrorMsg: '', loggedCooldown: false }
}
const state = global.__dleDbState

if (!uri) {
  console.warn('⚠ MONGODB_URI not set in .env.local. Running without database.')
}

let clientPromise

function buildClient(uriStr) {
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
    ...(uriStr.includes('directConnection=true') ? { directConnection: true } : {}),
  })
}

if (!uri) {
  clientPromise = Promise.resolve(null)
} else if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = buildClient(uri)
    const connectPromise = client.connect()
      .then(c => {
        console.log('🟢 MongoDB (NextAuth client) connected')
        state.lastFailureAt = 0
        state.lastErrorMsg  = ''
        return c
      })
      .catch(err => {
        state.lastFailureAt = Date.now()
        state.lastErrorMsg  = err.message || String(err)
        state.loggedCooldown = false
        console.warn('⚠ MongoDB (NextAuth client) connection FAILED:', state.lastErrorMsg)
        console.warn('⚠ Auth uses JWT sessions — sign-in still works; DB features disabled.')
        console.warn('⚠ Run  `node test-db.js`  to diagnose DNS/TCP/TLS issues.')
        // Reset cached promise so we can retry after cooldown.
        global._mongoClientPromise = null
        return null
      })

    // Hard timeout: give up fast if the network is dropping packets.
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
  const client = buildClient(uri)
  clientPromise = client.connect()
    .then(c => c)
    .catch(err => {
      console.warn('⚠ MongoDB (NextAuth client) connection failed:', err.message)
      return null
    })
}

// Wrap promise so consumers also respect the shared circuit breaker.
async function getClient() {
  if (!uri) return null
  const now = Date.now()
  if (state.lastFailureAt && (now - state.lastFailureAt) < FAILURE_COOLDOWN_MS) {
    return null
  }
  return clientPromise
}

export default getClient
