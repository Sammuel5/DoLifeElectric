// Quick MongoDB connection diagnostics.
// Run with:  node test-db.js
// (Make sure you're in the project folder and .env.local exists.)

'use strict'

// ---------- Load .env.local / .env first ----------
const fs = require('fs')
const path = require('path')

function loadEnv(file) {
  try {
    const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8')
    content.split(/\r?\n/).forEach(line => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
      if (m && !process.env[m[1]]) {
        let val = m[2]
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        process.env[m[1]] = val
      }
    })
    console.log(`✓ Loaded ${file}`)
  } catch {
    console.log(`· ${file} not found (skipping)`)
  }
}

loadEnv('.env.local')
loadEnv('.env')

// ---------- Apply DNS fixes ----------
const dns = require('dns')
const https = require('https')

if (process.platform === 'win32') {
  // Layer 1: force c-ares to public DNS
  try { dns.setServers(['8.8.8.8', '1.1.1.1']) } catch (_) {}
  try {
    if (typeof dns.setDefaultResultOrder === 'function') dns.setDefaultResultOrder('ipv4first')
    else if (typeof dns.setResultOrder === 'function') dns.setResultOrder('ipv4first')
  } catch (_) {}

  // Layer 2: DoH monkey-patch for SRV/TXT (bulletproof — uses HTTPS/443)
  installDohPatch(dns, https)
  console.log('🔧 [dns-fix] Windows: public DNS (8.8.8.8, 1.1.1.1) + DoH patch active')
} else {
  console.log(`🔧 Platform ${process.platform}: using system DNS resolver`)
}

function installDohPatch(dns, https) {
  const ENDPOINTS = [
    'https://cloudflare-dns.com/dns-query',
    'https://dns.google/resolve',
  ]
  const TYPE_SRV = 33, TYPE_TXT = 16

  function dohQuery(name, type) {
    return new Promise((resolve, reject) => {
      let idx = 0
      function tryNext() {
        if (idx >= ENDPOINTS.length) return reject(new Error('all DoH endpoints failed'))
        const ep = ENDPOINTS[idx++]
        const url = `${ep}?name=${encodeURIComponent(name)}&type=${type}`
        const req = https.get(url, { headers: { Accept: 'application/dns-json' }, timeout: 5000 }, (res) => {
          if (res.statusCode !== 200) { res.resume(); return tryNext() }
          let data = ''
          res.setEncoding('utf8')
          res.on('data', c => data += c)
          res.on('end', () => {
            try {
              const json = JSON.parse(data)
              if (json.Status !== 0 && json.Status !== undefined) return reject(new Error('NXDOMAIN'))
              resolve(json)
            } catch (_) { tryNext() }
          })
        })
        req.on('error', tryNext)
        req.on('timeout', () => { req.destroy(); tryNext() })
      }
      tryNext()
    })
  }

  const parseSrv = json => (json.Answer || []).filter(a => a.type === TYPE_SRV).map(a => {
    const [p, w, port, name] = a.data.split(/\s+/)
    return { priority: +p, weight: +w, port: +port, name: name.replace(/\.$/, '') }
  })
  const parseTxt = json => (json.Answer || []).filter(a => a.type === TYPE_TXT).map(a => {
    if (Array.isArray(a.data)) return a.data.map(String)
    const str = String(a.data)
    if (str.includes('"')) {
      const out = []; const re = /"([^"]*)"/g; let m
      while ((m = re.exec(str)) !== null) out.push(m[1])
      if (out.length) return out
    }
    return [str]
  })

  const origSrv = dns.promises.resolveSrv
  const origTxt = dns.promises.resolveTxt
  dns.promises.resolveSrv = async function(name) {
    try { const r = parseSrv(await dohQuery(name, TYPE_SRV)); if (r.length) return r } catch(_){}
    return origSrv.call(dns.promises, name)
  }
  dns.promises.resolveTxt = async function(name) {
    try { const r = parseTxt(await dohQuery(name, TYPE_TXT)); if (r.length) return r } catch(_){}
    return origTxt.call(dns.promises, name)
  }
}

// ---------- Validate URI ----------
const uri = process.env.MONGODB_URI

if (!uri) {
  console.error('\n❌ MONGODB_URI not set in .env.local.')
  process.exit(1)
}

if (/<username>|<password>|USERNAME:PASSWORD/i.test(uri)) {
  console.error('\n❌ MONGODB_URI still has placeholder credentials.')
  console.error('Replace <username>/<password> with your real MongoDB Atlas database credentials.')
  process.exit(1)
}

const safeUri = uri.replace(/:\/\/[^@]+@/, '://<credentials>@')
console.log(`\n🔍 Using URI: ${safeUri.slice(0, 160)}${safeUri.length > 160 ? '…' : ''}`)

const { MongoClient } = require('mongodb')

async function run() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('TEST 1: Node.js DNS / MongoDB SRV resolution')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  let parsed
  try {
    parsed = new URL(uri)
  } catch (e) {
    console.error(`✗ Invalid MongoDB URI: ${e.message}`)
    process.exitCode = 1
    return
  }

  const host = parsed.hostname
  console.log(`🔍 MongoDB hostname: ${host}`)

  if (parsed.protocol !== 'mongodb+srv:') {
    console.log(`ℹ URI protocol is ${parsed.protocol}; SRV lookup test skipped.`)
  } else {
    try {
      const start = Date.now()
      const records = await dns.promises.resolveSrv(`_mongodb._tcp.${host}`)
      const ms = Date.now() - start
      console.log(`✓ SRV lookup succeeded in ${ms}ms → ${records.map(r => `${r.name}:${r.port}`).join(', ')}`)
    } catch (e) {
      console.error(`✗ SRV lookup FAILED: ${e.code || e.message}`)
      console.error('\nIf this says ECONNREFUSED or TIMEOUT, your network/DNS is blocked.')
      console.error('Check VPN, antivirus web scanning, firewall, or Atlas Network Access IP whitelist.')
      process.exitCode = 1
      return
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('TEST 2: MongoDB Atlas connection + TLS + authentication')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    waitQueueTimeoutMS: 10000,
    family: 4,
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
    retryWrites: true,
  })

  try {
    const start = Date.now()
    await client.connect()
    const res = await client.db('admin').command({ ping: 1 })
    const ms = Date.now() - start
    console.log(`✓ Connected & pinged in ${ms}ms → ping:`, res)

    const db = client.db('DoLifeElectric')
    const collections = await db.listCollections().toArray()
    console.log(`✓ Database "DoLifeElectric" accessible (${collections.length} collections):`,
      collections.map(c => c.name).join(', ') || '(empty)')

    console.log('\n🎉 DATABASE IS WORKING.')
    console.log('Restart `npm run dev` and the admin dashboard will connect live.')
  } catch (e) {
    console.error(`✗ CONNECTION FAILED: ${e.message}`)
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    const msg = (e.message || '').toLowerCase()
    if (/authentication failed|bad auth|scram|sasl/i.test(msg)) {
      console.error('LIKELY CAUSE: Wrong MongoDB username/password.')
      console.error('Re-copy the connection string from MongoDB Atlas → Cluster → Connect → Drivers.')
    } else if (/tls|ssl|certificate|tlsv1 alert/i.test(msg)) {
      console.error('LIKELY CAUSE: TLS/SSL inspection or certificate problem.')
      console.error('Disable "HTTPS/SSL scanning" / "Encrypted Web Scan" in your antivirus.')
    } else if (/timeout|enotfound|econnrefused|querysrv/i.test(msg)) {
      console.error('LIKELY CAUSE: DNS/network problem.')
      console.error('This script uses DNS-over-HTTPS (port 443) which bypasses most DNS blocks.')
      console.error('If still failing: check Atlas Network Access (add your IP), disable VPN, or try mobile hotspot.')
    } else {
      console.error('See the MongoDB error above for the next troubleshooting step.')
    }
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    process.exitCode = 1
  } finally {
    await client.close().catch(() => {})
  }
}

run().catch(err => {
  console.error('\n❌ Unexpected error:', err)
  process.exitCode = 1
})
