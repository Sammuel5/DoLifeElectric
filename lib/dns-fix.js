// DNS compatibility layer for Windows.
//
// Contains NO secrets, NO hostnames, NO cluster-specific data.
//
// PROBLEM:
// On Windows, antivirus/VPN/Hyper-V often leave a dead DNS proxy at 127.0.0.1
// in the system DNS server list. Node.js uses c-ares (a C library) for
// dns.resolveSrv / dns.resolveTxt, which the MongoDB driver needs to discover
// Atlas cluster hosts from the mongodb+srv:// URI. c-ares tries the dead proxy
// and gets ECONNREFUSED. Browsers use Windows' DoH/DNS Client which works fine.
//
// The dns.lookup() function (used by our mongoDnsLookup) uses getaddrinfo / OS
// resolver and works, BUT it only does A/AAAA records — it cannot do SRV or TXT
// queries. So `family:4` and a custom `lookup` only fixes the second half of
// resolution (connecting to individual shard hosts), not the SRV/TXT bootstrap.
//
// SOLUTION (layered, defense-in-depth):
//   1. with-dns.cjs applies dns.setServers() to the main Next process.
//   2. instrumentation.js (ROOT level) applies the full fix in every worker.
//   3. HERE (loaded from dbConnect.js / mongodb.js):
//      a. Calls dns.setServers() as a defense-in-depth c-ares override.
//      b. Exports mongoDnsLookup (OS resolver for A/AAAA lookups).
//      c. MONKEY-PATCHES dns.resolveSrv/resolveTxt (callback & promises forms)
//         to use DNS-over-HTTPS (DoH) on Windows. DoH uses HTTPS/443 which
//         passes through every antivirus, VPN, and firewall — unlike raw UDP
//         DNS (port 53) which c-ares uses and which the dead proxy breaks.
//
// On Linux/macOS/Vercel we leave DNS alone — the platform resolver works.

import dns from 'dns'
import https from 'https'

const isWindows = process.platform === 'win32'

// ---------------------------------------------------------------------------
// Layer a: set DNS servers via c-ares (defense in depth, fast path)
// ---------------------------------------------------------------------------

if (isWindows) {
  try {
    const servers = dns.getServers()
    const hasPublic = servers.some(s => s === '8.8.8.8' || s === '1.1.1.1')
    if (!hasPublic) {
      dns.setServers(['8.8.8.8', '1.1.1.1'])
    }
    if (typeof dns.setDefaultResultOrder === 'function') {
      dns.setDefaultResultOrder('ipv4first')
    } else if (typeof dns.setResultOrder === 'function') {
      dns.setResultOrder('ipv4first')
    }
  } catch (_) { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Layer b: OS-resolver lookup for A/AAAA (passed to Mongo driver as `lookup`)
// ---------------------------------------------------------------------------

export function mongoDnsLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }
  const family = typeof options === 'number' ? options : (options.family || 0)
  const hints = (options.hints || 0) | dns.ADDRCONFIG
  const all = !!(options && options.all)
  dns.lookup(hostname, { family, hints, all, verbatim: false }, (err, address, famOrAddrs) => {
    if (err) return callback(err)
    callback(null, address, famOrAddrs)
  })
}

// ---------------------------------------------------------------------------
// Layer c: DoH-based SRV/TXT monkey-patch (bulletproof fix)
// ---------------------------------------------------------------------------

let dohPatched = false
let dohPatchPromise = null

if (isWindows && !dohPatched) {
  dohPatched = true
  // Kick off the patch immediately but don't block module load on the
  // async ESM namespace step. We expose a `whenDnsReady()` promise so that
  // dbConnect.js / mongodb.js can await full installation before connecting.
  dohPatchPromise = patchDnsWithDoh()
}

/**
 * Resolves when the DoH monkey-patch is fully installed (including the
 * async 'dns/promises' ESM namespace step). Call this before making DNS
 * calls that need to go through DoH.
 */
export function whenDnsReady() {
  return dohPatchPromise || Promise.resolve()
}

/**
 * Patch dns.resolveSrv / dns.resolveTxt (callback and promise forms, plus
 * the 'dns/promises' ESM sub-module namespace) to use DNS-over-HTTPS.
 */
async function patchDnsWithDoh() {
  // DoH endpoints (tried in order; Cloudflare first — fastest and most
  // privacy-preserving; Google as fallback).
  const DOH_ENDPOINTS = [
    'https://cloudflare-dns.com/dns-query',
    'https://dns.google/resolve',
  ]
  const TYPE_SRV = 33
  const TYPE_TXT = 16

  // ---- DoH helpers ----

  function dohQuery(name, type) {
    return new Promise((resolve, reject) => {
      let idx = 0
      function tryNext() {
        if (idx >= DOH_ENDPOINTS.length) {
          return reject(new Error(`All DoH endpoints failed for ${name} type ${type}`))
        }
        const endpoint = DOH_ENDPOINTS[idx++]
        const url = `${endpoint}?name=${encodeURIComponent(name)}&type=${type}`
        const req = https.get(url, {
          headers: { 'Accept': 'application/dns-json' },
          timeout: 5000,
        }, (res) => {
          if (res.statusCode !== 200) { res.resume(); return tryNext() }
          let data = ''
          res.setEncoding('utf8')
          res.on('data', chunk => { data += chunk })
          res.on('end', () => {
            try {
              const json = JSON.parse(data)
              if (json.Status !== 0 && json.Status !== undefined) {
                return reject(new Error(`DoH status ${json.Status} for ${name}`))
              }
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

  function parseSrv(json) {
    return (json.Answer || [])
      .filter(a => a.type === TYPE_SRV)
      .map(a => {
        const [p, w, port, name] = a.data.split(/\s+/)
        return {
          priority: parseInt(p, 10),
          weight:   parseInt(w, 10),
          port:     parseInt(port, 10),
          name:     name.replace(/\.$/, ''),
        }
      })
  }

  function parseTxt(json) {
    // dns.resolveTxt returns string[][] — each TXT record is an array of
    // character-string chunks (RFC 4408). A single TXT record with one
    // string "authSource=admin&..." returns as [["authSource=admin&...]].
    return (json.Answer || [])
      .filter(a => a.type === TYPE_TXT)
      .map(a => {
        if (Array.isArray(a.data)) {
          // Cloudflare sometimes sends data as array of chunks already
          return a.data.map(String)
        }
        const str = String(a.data)
        // Quoted-string format (Cloudflare): "\"chunk1\" \"chunk2\""
        if (str.includes('"')) {
          const chunks = []
          const re = /"([^"]*)"/g
          let m
          while ((m = re.exec(str)) !== null) chunks.push(m[1])
          if (chunks.length > 0) return chunks
        }
        // Unquoted format (Google): "authSource=admin&replicaSet=..."
        return [str]
      })
  }

  // ---- Capture ORIGINALS first (before we overwrite anything) ----

  // Callback-based
  const origResolveSrv = dns.resolveSrv
  const origResolveTxt = dns.resolveTxt
  const origResolve    = dns.resolve

  // Promise-based (dns.promises)
  const dnsPromises = dns.promises
  const origPSolveSrv = dnsPromises.resolveSrv
  const origPSolveTxt = dnsPromises.resolveTxt
  const origPSolve    = dnsPromises.resolve

  // ---- Build wrapper functions ----
  // These close over the originals captured above.

  // Callback SRV
  const patchedResolveSrv = function (hostname, callback) {
    if (typeof callback !== 'function') {
      return origResolveSrv.call(dns, hostname, callback)
    }
    dohQuery(hostname, TYPE_SRV)
      .then(json => {
        const recs = parseSrv(json)
        if (recs.length === 0) return origResolveSrv.call(dns, hostname, callback)
        callback(null, recs)
      })
      .catch(() => origResolveSrv.call(dns, hostname, callback))
  }

  // Callback TXT
  const patchedResolveTxt = function (hostname, callback) {
    if (typeof callback !== 'function') {
      return origResolveTxt.call(dns, hostname, callback)
    }
    dohQuery(hostname, TYPE_TXT)
      .then(json => {
        const recs = parseTxt(json)
        if (recs.length === 0) return origResolveTxt.call(dns, hostname, callback)
        callback(null, recs)
      })
      .catch(() => origResolveTxt.call(dns, hostname, callback))
  }

  // Promise SRV
  const patchedPSolveSrv = async function (hostname) {
    try {
      const recs = parseSrv(await dohQuery(hostname, TYPE_SRV))
      if (recs.length > 0) return recs
    } catch (_) { /* fall through */ }
    return origPSolveSrv.call(dnsPromises, hostname)
  }

  // Promise TXT
  const patchedPSolveTxt = async function (hostname) {
    try {
      const recs = parseTxt(await dohQuery(hostname, TYPE_TXT))
      if (recs.length > 0) return recs
    } catch (_) { /* fall through */ }
    return origPSolveTxt.call(dnsPromises, hostname)
  }

  // Callback generic resolve (dispatches by rrtype)
  const patchedResolve = function (hostname, rrtype, callback) {
    let type = rrtype, cb = callback
    if (typeof rrtype === 'function') { cb = rrtype; type = 'A' }
    if (type === 'SRV') return patchedResolveSrv(hostname, cb)
    if (type === 'TXT') return patchedResolveTxt(hostname, cb)
    return origResolve.call(dns, hostname, type, cb)
  }

  // Promise generic resolve
  const patchedPSolve = async function (hostname, rrtype) {
    const type = rrtype || 'A'
    if (type === 'SRV') return patchedPSolveSrv(hostname)
    if (type === 'TXT') return patchedPSolveTxt(hostname)
    return origPSolve.call(dnsPromises, hostname, type)
  }

  // ---- Install patches on dns and dns.promises ----

  dns.resolveSrv = patchedResolveSrv
  dns.resolveTxt = patchedResolveTxt
  dns.resolve    = patchedResolve

  dnsPromises.resolveSrv = patchedPSolveSrv
  dnsPromises.resolveTxt = patchedPSolveTxt
  dnsPromises.resolve    = patchedPSolve

  // ---- Patch the 'dns/promises' ESM sub-module ----
  //
  // The MongoDB driver v6 uses:
  //     import { resolveSrv, resolveTxt } from 'dns/promises'
  //
  // In Node.js ESM, named exports are live bindings to the default export's
  // properties when the module is backed by CJS (which 'dns/promises' is).
  // That means overwriting dnsPromises.resolveSrv SHOULD propagate. But to
  // be absolutely safe, we also import the namespace and redefine the named
  // exports via Object.defineProperty (which works on Node's synthetic ESM
  // namespace for built-in modules).
  try {
    const ns = await import('dns/promises')
    const assign = (obj, key, val) => {
      try { obj[key] = val } catch (_) {
        try {
          Object.defineProperty(obj, key, { value: val, writable: true, configurable: true, enumerable: true })
        } catch (_) { /* cannot patch this reference — dns.promises is patched, so default imports still work */ }
      }
    }
    assign(ns, 'resolveSrv', patchedPSolveSrv)
    assign(ns, 'resolveTxt', patchedPSolveTxt)
    assign(ns, 'resolve',    patchedPSolve)
    if (ns.default && ns.default !== dnsPromises) {
      assign(ns.default, 'resolveSrv', patchedPSolveSrv)
      assign(ns.default, 'resolveTxt', patchedPSolveTxt)
      assign(ns.default, 'resolve',    patchedPSolve)
    }
  } catch (_) { /* best effort */ }

  console.log('🛡️  [dns-fix] DoH (DNS-over-HTTPS) monkey-patch active for SRV/TXT on Windows')
}

export default function ensureDnsWorks() {
  return true
}
