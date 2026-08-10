// Run on the problem computer with:
//   node test-db.js
// Tests: DNS → TCP → TLS (with cert/cipher info) → Raw MongoDB "hello" wire probe
//        → Driver replica-set → Driver direct → Driver skip-cert-check.

const dns = require('dns')
const net = require('net')
const tls = require('tls')
const { MongoClient } = require('mongodb')

try { dns.setDefaultResultOrder('ipv4first') } catch (_) {}

// ---------------------------------------------------------------------------
// Load URI from CLI arg or MONGODB_URI env var (no hardcoded credentials).
// ---------------------------------------------------------------------------
const URI = (process.argv[2] || process.env.MONGODB_URI || '').trim()

if (!URI) {
  console.log('=== DLE MongoDB Diagnostics ===')
  console.log('')
  console.log('  ❌ No MongoDB URI provided.')
  console.log('')
  console.log('  Usage:')
  console.log('    node test-db.js "mongodb+srv://<user>:<pass>@cluster.mongodb.net/DoLifeElectric?retryWrites=true&w=majority"')
  console.log('')
  console.log('  Or set MONGODB_URI in .env.local and run:')
  console.log('    node test-db.js')
  console.log('')
  process.exit(1)
}

// Parse hostnames from the connection string (supports both SRV and standard URIs)
function parseHosts(uri) {
  try {
    const m = uri.match(/^mongodb(?:\+srv)?:\/\/[^@]+@([^/?]+)/i)
    if (!m) return []
    return m[1].split(',').map(h => h.split(':')[0].trim()).filter(Boolean)
  } catch (_) { return [] }
}

const hosts = parseHosts(URI)

console.log('=== DLE MongoDB Diagnostics ===')
console.log('')
console.log(`  Node.js  : ${process.version}`)
const nodeMajor = parseInt((process.version.match(/^v(\d+)/) || [])[1] || '0', 10)
if (nodeMajor < 18) {
  console.log('   ⚠️  Node.js is too OLD — need v18.17+ or v20 LTS. Upgrade with: https://nodejs.org/')
} else if (nodeMajor >= 22) {
  console.log('   ⚠️  You are running Node.js ' + process.version + '. Next.js 14 is supported on v18/v20 LTS.')
  console.log('      If connections fail, install Node.js 20 LTS from https://nodejs.org/ and re-test.')
}
try {
  const mdbPkg = require('mongodb/package.json')
  console.log(`  Driver   : mongodb v${mdbPkg.version}`)
} catch (_) {
  console.log(`  Driver   : (unknown — install dependencies first: npm install)`)
}
console.log(`  Platform : ${process.platform} ${process.arch}`)
console.log('')
console.log('Testing with URI:')
console.log(URI.replace(/:([^:@]{3,})@/, ':***@'))
console.log(`Hosts: ${hosts.join(', ') || '(none parsed)'}`)
console.log('')

// ---------------------------------------------------------------------------
function resolveAll(host) {
  return new Promise(resolve => {
    dns.lookup(host, { all: true, family: 0 }, (err, addrs) => {
      if (err) return resolve([])
      resolve(addrs || [])
    })
  })
}

async function testDNS(host) {
  const start = Date.now()
  const addrs = await resolveAll(host)
  if (addrs.length === 0) {
    console.log(`  ❌ DNS  ${host}: FAILED`)
    return false
  }
  const summary = addrs.map(a => `${a.address}${a.family === 6 ? '(IPv6)' : ''}`).join(', ')
  console.log(`  ✅ DNS  ${host} → ${summary}  (${Date.now()-start}ms)`)
  return true
}

function testTCP(host, port = 27017) {
  return new Promise(resolve => {
    const start = Date.now()
    const sock = new net.Socket()
    let done = false
    const finish = (ok, msg) => {
      if (done) return; done = true
      try { sock.destroy() } catch (_) {}
      if (ok) console.log(`  ✅ TCP  ${host}:${port} connected  (${Date.now()-start}ms)`)
      else    console.log(`  ❌ TCP  ${host}:${port} ${msg}`)
      resolve(ok)
    }
    sock.setTimeout(8000, () => finish(false, 'TIMED OUT (8s)'))
    sock.on('connect', () => finish(true))
    sock.on('error', err => finish(false, `error: ${err.code || err.message}`))
    sock.connect(port, host)
  })
}

function testTLS(host, port = 27017) {
  return new Promise(resolve => {
    const start = Date.now()
    let done = false
    const sock = tls.connect(port, host, {
      servername: host,
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    }, () => {
      if (!sock.authorized) return finish(false, `cert rejected: ${sock.authorizationError}`)
      const proto = sock.getProtocol ? sock.getProtocol() : '?'
      const cipher = sock.getCipher ? sock.getCipher() : {}
      const peer = sock.getPeerCertificate ? sock.getPeerCertificate(true) : {}
      const issuer = peer.issuer ? (peer.issuer.O || peer.issuer.CN || 'unknown CA') : 'unknown'
      const subject = peer.subject ? (peer.subject.CN || 'unknown') : 'unknown'
      finish(true, proto, cipher, subject, issuer)
    })
    const finish = (ok, msg, proto, cipher, subject, issuer) => {
      if (done) return; done = true
      try { sock.destroy() } catch (_) {}
      if (ok) {
        const cipherStr = cipher && cipher.name ? `${cipher.name} (${cipher.version || '?'})` : '?'
        const protoStr = proto || '?'
        console.log(`  ✅ TLS  ${host}:${port} OK — ${protoStr} / ${cipherStr}`)
        console.log(`            cert: ${subject || '?'}  issuer: ${issuer || '?'}`)
      } else {
        console.log(`  ❌ TLS  ${host}:${port} ${msg}`)
      }
      resolve(ok)
    }
    sock.setTimeout(10000, () => finish(false, 'TIMED OUT (10s) — TLS handshake hung (antivirus SSL inspection?)'))
    sock.on('error', err => finish(false, `error: ${err.code || err.message}`))
  })
}

// Send a real MongoDB OP_MSG "hello" (handshake) over a raw TLS socket and read reply.
// This simulates exactly what the driver does first on every new connection.
function testMongoHello(host, port = 27017) {
  return new Promise(resolve => {
    const start = Date.now()
    let done = false
    const sock = tls.connect(port, host, {
      servername: host,
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    }, () => {
      if (!sock.authorized) return finish(false, `TLS not authorized: ${sock.authorizationError}`, 'tls')
      // Build a MongoDB OP_MSG "hello" command (no auth needed — first message).
      // Wire protocol:
      //   MsgHeader: messageLength(4) i32 LE, requestID(4), responseTo(4)=0, opCode(4)=2013 (OP_MSG)
      //   OP_MSG:     flagBits(4)=0, sectionKind(1)=0, document(bson)
      // The "hello" command: { hello: 1, maxAwaitTimeMS: 0 }
      const helloBson = buildHelloBson()
      const bodyLen = 4 + 1 + helloBson.length // flagBits + kind + doc
      const totalLen = 4*4 + bodyLen
      const buf = Buffer.alloc(totalLen)
      let o = 0
      buf.writeInt32LE(totalLen, o); o += 4
      buf.writeInt32LE(1, o); o += 4           // requestID
      buf.writeInt32LE(0, o); o += 4           // responseTo
      buf.writeInt32LE(2013, o); o += 4        // opCode OP_MSG
      buf.writeInt32LE(0, o); o += 4           // flagBits
      buf.writeUInt8(0, o); o += 1             // section kind 0 (single body)
      helloBson.copy(buf, o); o += helloBson.length
      sock.write(buf)
    })
    let dataBuf = Buffer.alloc(0)
    sock.on('data', chunk => {
      dataBuf = Buffer.concat([dataBuf, chunk])
      // Need at least the 16-byte header to know message length
      if (dataBuf.length < 4) return
      const msgLen = dataBuf.readInt32LE(0)
      if (dataBuf.length < msgLen) return
      // We got a complete reply — the server actually responded!
      const dur = Date.now()-start
      // Try to see if reply contains "ok" or "isWritablePrimary"
      const asText = dataBuf.slice(0, msgLen).toString('utf8').replace(/[^\x20-\x7E]/g,'')
      const hasOk = /ismaster|helloOk|isWritablePrimary|topologyVersion|"ok"/.test(asText)
      finish(true, `reply received in ${dur}ms (${msgLen} bytes) — ${hasOk ? 'looks like a valid hello response!' : 'data received, content unclear'}`)
    })
    sock.on('end', () => finish(false, 'server closed connection after TLS handshake (IP not whitelisted in Atlas? Auth required?)', 'closed'))
    const finish = (ok, msg, why) => {
      if (done) return; done = true
      try { sock.destroy() } catch (_) {}
      if (ok) console.log(`  ✅ HELLO ${host}:${port} ${msg}`)
      else    console.log(`  ❌ HELLO ${host}:${port} ${msg}`)
      resolve({ ok, why })
    }
    sock.setTimeout(12000, () => finish(false, 'TIMED OUT (12s) — no reply to MongoDB hello (IP whitelist? Firewall?)', 'timeout'))
    sock.on('error', err => finish(false, `error: ${err.code || err.message}`, 'error'))
  })
}

// Minimal BSON encoder for the MongoDB handshake "hello" command.
// { hello: 1 (int32), $db: "admin", maxAwaitTimeMS: 0 (int64) }
function buildHelloBson() {
  const NUL = Buffer.from([0x00])
  function cstr(s) { return Buffer.from(s + '\0', 'utf8') }
  function int32Element(type, name, v) {
    const b = Buffer.alloc(4); b.writeInt32LE(v, 0)
    return Buffer.concat([Buffer.from([type]), cstr(name), b])
  }
  function int64Element(name, v) {
    const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(v), 0)
    return Buffer.concat([Buffer.from([0x12]), cstr(name), b])
  }
  function strElement(name, v) {
    const vb = Buffer.from(v + '\0', 'utf8')
    const len = Buffer.alloc(4); len.writeInt32LE(vb.length, 0)
    return Buffer.concat([Buffer.from([0x02]), cstr(name), len, vb])
  }
  const elHello = int32Element(0x10, 'hello', 1)         // int32(1)
  const elDb    = strElement('$db', 'admin')             // required for OP_MSG (3.6+)
  const elWait  = int64Element('maxAwaitTimeMS', 0)      // int64(0)
  const inner   = Buffer.concat([elHello, elDb, elWait, NUL])
  const doc     = Buffer.alloc(4 + inner.length)
  doc.writeInt32LE(doc.length, 0)
  inner.copy(doc, 4)
  return doc
}

// ---------------------------------------------------------------------------
function testMongo(label, uri, opts = {}) {
  return new Promise(async resolve => {
    const start = Date.now()
    let timedOut = false
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 20000,
      connectTimeoutMS: 20000,
      socketTimeoutMS: 30000,
      family: 4,
      ...opts,
    })
    const timer = setTimeout(() => {
      timedOut = true
      console.log(`  ❌ ${label}: TIMED OUT after 20s`)
      try { client.close(true) } catch (_) {}
      resolve(false)
    }, 25000)
    try {
      await client.connect()
      const db = client.db('DoLifeElectric')
      const res = await db.command({ hello: 1 })
      if (timedOut) return
      clearTimeout(timer)
      const collections = await db.listCollections().toArray()
      console.log(`  ✅ ${label}: OK in ${Date.now()-start}ms (hello ok=${res.ok}, primary=${!!res.isWritablePrimary})`)
      console.log(`     DB "DoLifeElectric" has ${collections.length} collections: ${collections.map(c=>c.name).join(', ') || '(empty)'}`)
      for (const col of ['artists','musics','donations','admins','users','trackactivities']) {
        try {
          const n = await db.collection(col).countDocuments()
          console.log(`     · ${col}: ${n} records`)
        } catch (_) {}
      }
      resolve(true)
    } catch (e) {
      if (timedOut) return
      clearTimeout(timer)
      console.log(`  ❌ ${label}: ${e.message}`)
      if (e.reason && e.reason.error) console.log(`     reason: ${e.reason.error.message || e.reason.error}`)
      if (e.cause && e.cause.message) console.log(`     cause : ${e.cause.message}`)
      resolve(false)
    } finally {
      try { await client.close() } catch (_) {}
    }
  })
}

// ---------------------------------------------------------------------------
async function main() {
  // ---- Step 1: DNS ----
  console.log('--- Step 1: DNS resolution (all address families) ---')
  let dnsOk = true
  for (const h of hosts) dnsOk = (await testDNS(h)) && dnsOk
  console.log('')

  // ---- Step 2: TCP ----
  console.log('--- Step 2: TCP connection to port 27017 ---')
  let tcpOk = true
  for (const h of hosts) tcpOk = (await testTCP(h)) && tcpOk
  console.log('')

  // ---- Step 3: TLS ----
  console.log('--- Step 3: TLS handshake (cipher + cert info) ---')
  let tlsOk = true
  for (const h of hosts) tlsOk = (await testTLS(h)) && tlsOk
  console.log('')

  // ---- Step 3b: Raw MongoDB "hello" over TLS (does data actually flow?) ----
  console.log('--- Step 3b: Raw MongoDB "hello" over TLS (simulates what the driver sends first) ---')
  let helloOk = false
  let helloClosed = false
  for (const h of hosts) {
    const r = await testMongoHello(h)
    if (r.ok) helloOk = true
    if (r.why === 'closed') helloClosed = true
  }
  console.log('')

  // Diagnostics
  if (!dnsOk) console.log('💡 DNS is failing. Try: disconnect VPN, set Windows DNS to 8.8.8.8/1.1.1.1.')
  if (!tcpOk) console.log('💡 TCP 27017 is BLOCKED. Use phone hotspot; Vercel deployment will still work.')
  if (tlsOk && !helloOk) {
    console.log('💡 TLS handshake works but MongoDB handshake gets NO RESPONSE.')
    if (helloClosed) {
      console.log('   The SERVER CLOSED the connection after TLS. This almost always means:')
      console.log('   👉 YOUR PUBLIC IP IS NOT WHITELISTED IN MONGODB ATLAS!')
      console.log('')
      console.log('   Fix:')
      console.log('   1) Go to https://cloud.mongodb.com/ → Network Access → IP Access List')
      console.log('   2) Click "+ ADD IP ADDRESS"')
      console.log('   3) Click "ALLOW ACCESS FROM ANYWHERE" (add 0.0.0.0/0) OR add your current public IP')
      console.log('   4) Wait 30-60 seconds, then re-run this test')
      console.log('')
      console.log('   (Your two computers have DIFFERENT public IPs if they are on different networks,')
      console.log('   so you must whitelist the second PC\'s IP too. "ALLOW FROM ANYWHERE" is easiest.)')
    } else {
      console.log('   The connection times out waiting for a reply. Possible causes:')
      console.log('   • Local firewall (Windows Defender Firewall) blocking outbound non-HTTP traffic')
      console.log('   • Antivirus deep-packet-inspection that drops MongoDB wire-protocol bytes')
      console.log('   • Router/ISP filtering traffic to port 27017 after TLS handshake')
      console.log('   Fix: try phone hotspot, or add 0.0.0.0/0 in Atlas IP Access List.')
    }
  }
  console.log('')

  // ---- Step 4: Driver replica-set ----
  console.log('--- Step 4: Full driver replica-set connection ---')
  const okRS = await testMongo('Replica Set mode', URI)
  console.log('')

  // ---- Step 5: Direct single-node mode (non-SRV only) ----
  console.log('--- Step 5: Direct single-node mode (bypasses replica-set discovery) ---')
  let okDirect = false
  const isSrv = /^mongodb\+srv:\/\//i.test(URI)
  if (isSrv) {
    console.log('  ⚠️  Skipped — SRV URI does not support directConnection mode.')
    console.log('     (This is normal. Replica-set mode on SRV is the standard.)')
  } else {
    // Build a direct URI that uses only the first host, removes replicaSet, adds directConnection.
    const firstHost = hosts[0] ? hosts[0] + ':27017' : ''
    if (firstHost) {
      const directUri = URI
        .replace(/(mongodb\:\/\/[^@]+@)([^?]+)(\?.+)/, (_, p, _h, q) => p + firstHost + q)
        .replace(/([?&])replicaSet=[^&]*/g, '')
        .replace(/\?&/, '?')
        .replace(/[?&]$/, '')
        + (URI.includes('?') ? '&' : '?') + 'directConnection=true'
      okDirect = await testMongo('Direct mode', directUri, { directConnection: true })
    } else {
      console.log('  ⚠️  Could not parse host from URI for direct mode test.')
    }
  }
  console.log('')

  // ---- Step 6: Skip cert validation (diagnostic only) ----
  console.log('--- Step 6: Driver with TLS cert validation DISABLED (diagnostic only) ---')
  // Do NOT add tlsInsecure (combines both and conflicts with explicit options).
  // Use tlsAllowInvalidCertificates only in options, and make sure URI doesn't set tlsInsecure.
  const noTlsUri = URI
    .replace(/[?&]tlsInsecure=true/g, '')
    .replace(/[?&]tlsAllowInvalidCertificates=true/g, '')
    .replace(/[?&]tlsAllowInvalidHostnames=true/g, '')
    .replace(/[?&]$/, '')
  const okNoTLS = await testMongo('Skip-cert mode', noTlsUri, {
    tlsAllowInvalidCertificates: true,
    tlsAllowInvalidHostnames: true,
  })
  console.log('')

  // ---- Final verdict ----
  const anyOk = okRS || okDirect
  console.log('--- VERDICT ---')
  if (anyOk) {
    console.log('🎉 A working connection was found!')
    if (okDirect && !okRS) {
      console.log('💡 Direct mode works but replica-set does not. Try using the SRV URI from your .env.local MONGODB_URI.')
    }
  } else if (helloClosed) {
    console.log('❌ Most likely fix: WHITELIST YOUR IP IN MONGODB ATLAS.')
    console.log('   Open https://cloud.mongodb.com/ → Network Access → ADD IP ADDRESS → ALLOW ACCESS FROM ANYWHERE (0.0.0.0/0).')
    console.log('   Then wait 60 seconds and re-run this test.')
  } else if (okNoTLS) {
    console.log('⚠️  Only insecure mode works — your PC has a TLS/certificate store issue.')
    console.log('   Try: npm rebuild  in the project folder; or update Node to LTS v22.')
  } else {
    console.log('❌ No connection mode worked. Try:')
    console.log('   1. Connect to your phone\'s MOBILE HOTSPOT and re-run')
    console.log('   2. Check Atlas IP whitelist (ALLOW 0.0.0.0/0)')
    console.log('   3. VERCEL DEPLOYMENT WILL STILL WORK regardless of local network issues.')
  }
  console.log('')
  console.log('=== Done ===')
}

main()
