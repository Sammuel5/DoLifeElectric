import "server-only";
// Apply DNS fix first (for Windows machines with broken c-ares DNS / DoH / VPN)
import './dns-fix'
// MongoDB client for NextAuth adapter (separate from Mongoose).
// On networks where MongoDB Atlas is unreachable (DNS/firewall/ISP), this
// module resolves to null so NextAuth falls back to JWT sessions instead
// of hanging the request.
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
// Give slow/TLS-intercepted networks a real chance before falling back.
const CONNECT_TIMEOUT_MS = 25000

if (!uri) {
  console.warn('⚠ MONGODB_URI not set in .env.local. Running without database.')
}

let client
let clientPromise

function buildClient(uriStr) {
  return new MongoClient(uriStr, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    waitQueueTimeoutMS: 30000,
    family: 4, // IPv4 first (avoid IPv6 issues on some Windows networks)
    // Explicit TLS — Atlas always requires encrypted connections.
    // These options help antivirus "HTTPS scanner" / corporate proxy scenarios.
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
    minInternalBufferSize: 1024 * 64,
    // Force direct mode if URI asks for it (single-node fallback)
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
        console.log('🟢 MongoDB (NextAuth) connected')
        return c
      })
      .catch(err => {
        console.warn('⚠ MongoDB (NextAuth) connection FAILED:', err.message)
        console.warn('⚠ Auth will use JWT-only sessions (login works; DB features disabled).')
        console.warn('⚠ Run  `node test-db.js`  in the project folder to diagnose DNS/TCP/TLS.')
        return null
      })
    // Hard fallback: if nothing after CONNECT_TIMEOUT_MS, give up so NextAuth doesn't hang.
    const timeoutPromise = new Promise(resolve => {
      setTimeout(() => {
        console.warn(`⚠ MongoDB (NextAuth) still connecting after ${CONNECT_TIMEOUT_MS}ms — using JWT fallback.`)
        console.warn('⚠ If this keeps happening, run  node test-db.js  to find the cause.')
        resolve(null)
      }, CONNECT_TIMEOUT_MS)
    })
    global._mongoClientPromise = Promise.race([connectPromise, timeoutPromise])
  }
  clientPromise = global._mongoClientPromise
} else {
  client = buildClient(uri)
  clientPromise = client.connect().catch(err => {
    console.warn('⚠ MongoDB (NextAuth) connection failed:', err.message)
    return null
  })
}

export default clientPromise
