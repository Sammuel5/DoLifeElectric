import "server-only";
// Apply DNS fix first (for Windows machines with broken c-ares DNS / DoH / VPN)
import './dns-fix'
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error('Database not configured. Please set MONGODB_URI in your .env.local file. See TUTORIAL.md Step 1 for setup.')
  }
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    // Force the database name to "DoLifeElectric" — this way every laptop/dev machine
    // uses the EXACT same database regardless of what comes after the "/" in MONGODB_URI.
    const DB_NAME = 'DoLifeElectric'
    console.log(`⏳ Connecting to MongoDB database "${DB_NAME}"...`)

    const opts = {
      dbName: DB_NAME,
      bufferCommands: false,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      family: 4, // IPv4 first
      // Explicit TLS (Atlas requires encryption; explicit helps some AV/proxy setups)
      tls: true,
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: false,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then(m => {
        console.log(`🟢 MongoDB connected → database: "${m.connection.name}" at ${m.connection.host}`)
        return m
      })
      .catch(err => {
        console.error('🔴 MongoDB connection FAILED:', err.message)
        console.error('🔴 Database features (artists/music/donations) will NOT work until connection is restored.')
        console.error('🔴 Run  `node test-db.js`  in the project folder to diagnose DNS/TCP/TLS issues.')
        cached.promise = null // allow retry on next request
        throw err
      })
  }
  cached.conn = await cached.promise
  return cached.conn
}

export default dbConnect
