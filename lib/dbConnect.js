import 'server-only'

import mongoose from 'mongoose'
import dns from 'node:dns'

// ---------------------------------------------------------------------------
// DNS configuration
//
// MongoDB Atlas uses mongodb+srv://, which requires an SRV DNS lookup.
//
// Your test-db.js confirmed that Google's and Cloudflare's DNS servers
// successfully resolve the Atlas SRV records.
//
// IMPORTANT:
// We keep mongodb+srv:// intact.
// We DO NOT rewrite it to mongodb://.
// ---------------------------------------------------------------------------

try {
  dns.setServers([
    '8.8.8.8',
    '1.1.1.1',
  ])

  console.log(
    '🔧 Node DNS servers configured: 8.8.8.8, 1.1.1.1'
  )
} catch (error) {
  console.warn(
    '⚠ Could not configure Node DNS servers:',
    error?.message || error
  )
}

// ---------------------------------------------------------------------------
// MongoDB configuration
// ---------------------------------------------------------------------------

const MONGODB_URI = process.env.MONGODB_URI

const DB_NAME = 'DoLifeElectric'

// ---------------------------------------------------------------------------
// Connection timeouts
// ---------------------------------------------------------------------------

const CONNECT_TIMEOUT_MS = 10000
const SERVER_SELECTION_MS = 10000
const SOCKET_TIMEOUT_MS = 30000
const WAIT_QUEUE_TIMEOUT_MS = 10000

// ---------------------------------------------------------------------------
// Global Mongoose cache
//
// Prevents multiple MongoDB connections during Next.js development hot reload.
// ---------------------------------------------------------------------------

if (!global.__dleMongoose) {
  global.__dleMongoose = {
    conn: null,
    promise: null,
  }
}

const cached = global.__dleMongoose

// ---------------------------------------------------------------------------
// Database unavailable error
// ---------------------------------------------------------------------------

class DbUnavailableError extends Error {
  constructor(message) {
    super(
      message ||
        'Database is temporarily unavailable'
    )

    this.name = 'DbUnavailableError'
  }
}

// ---------------------------------------------------------------------------
// MongoDB connection
// ---------------------------------------------------------------------------

async function dbConnect() {
  // -------------------------------------------------------------------------
  // Validate MONGODB_URI
  // -------------------------------------------------------------------------

  if (!MONGODB_URI) {
    throw new DbUnavailableError(
      'Database not configured. Please set MONGODB_URI in your environment variables.'
    )
  }

  // -------------------------------------------------------------------------
  // Make sure we're using the expected Atlas SRV URI.
  // -------------------------------------------------------------------------

  if (!MONGODB_URI.startsWith('mongodb+srv://')) {
    console.warn(
      '⚠ MONGODB_URI does not start with mongodb+srv://'
    )
  }

  // -------------------------------------------------------------------------
  // Return existing healthy connection.
  // -------------------------------------------------------------------------

  if (cached.conn) {
    const readyState =
      cached.conn.connection.readyState

    // Mongoose:
    // 0 = disconnected
    // 1 = connected
    // 2 = connecting
    // 3 = disconnecting

    if (readyState === 1) {
      return cached.conn
    }

    // Connection isn't healthy anymore.
    cached.conn = null
  }

  // -------------------------------------------------------------------------
  // If another request is already connecting, share that promise.
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Connect
  // -------------------------------------------------------------------------

  console.log(
    `⏳ Connecting to MongoDB database "${DB_NAME}"...`
  )

  console.log(
    '🔗 MongoDB connection mode: SRV'
  )

  const options = {
    dbName: DB_NAME,

    // Do not queue database operations while disconnected.
    bufferCommands: false,

    // Connection timing.
    serverSelectionTimeoutMS: SERVER_SELECTION_MS,
    connectTimeoutMS: CONNECT_TIMEOUT_MS,
    socketTimeoutMS: SOCKET_TIMEOUT_MS,
    waitQueueTimeoutMS: WAIT_QUEUE_TIMEOUT_MS,

    // IPv4 first.
    family: 4,

    // MongoDB Atlas TLS.
    tls: true,

    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,

    // Atlas retryable writes.
    retryWrites: true,
  }

  // -------------------------------------------------------------------------
  // Start connection.
  // -------------------------------------------------------------------------

  cached.promise = mongoose
    .connect(MONGODB_URI, options)

    .then((mongooseInstance) => {
      cached.conn = mongooseInstance

      console.log(
        '🟢 MongoDB connected successfully'
      )

      console.log(
        `🟢 Database: "${mongooseInstance.connection.name}"`
      )

      console.log(
        `🟢 Host: ${mongooseInstance.connection.host}`
      )

      return mongooseInstance
    })

    .catch((error) => {
      cached.promise = null
      cached.conn = null

      console.error(
        '🔴 MongoDB connection FAILED:',
        error?.message || error
      )

      throw error
    })

  // -------------------------------------------------------------------------
  // Wait for connection.
  // -------------------------------------------------------------------------

  try {
    cached.conn = await cached.promise

    return cached.conn
  } catch (error) {
    cached.promise = null
    cached.conn = null

    throw new DbUnavailableError(
      `Unable to connect to MongoDB: ${
        error?.message || String(error)
      }`
    )
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export default dbConnect

export {
  DbUnavailableError,
}