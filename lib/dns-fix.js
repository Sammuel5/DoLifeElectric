// DNS compatibility fix for Windows where c-ares (raw UDP DNS) is blocked.
//
// PROBLEM:
//   Node's built-in DNS resolver (c-ares) sends raw UDP packets on port 53.
//   On many Windows setups this is blocked by:
//     - Antivirus "HTTPS/DNS inspection" (Bitdefender, Kaspersky, ESET, Avast)
//     - VPNs that intercept DNS
//     - Windows Firewall rules that only allow DNS from browsers/System
//     - Corporate network policies forcing DNS-over-HTTPS via the OS
//   Windows itself (getaddrinfo / dns.lookup) and browsers can resolve hosts
//   fine, but Node's native c-ares gets ECONNREFUSED.
//
//   mongodb+srv:// URIs make TWO c-ares calls we can't avoid:
//     1. SRV lookup on _mongodb._tcp.<host>  → finds shard hosts + port
//     2. TXT lookup on <host>                → gets replicaSet + authSource
//   Then it does A/AAAA lookups on each shard hostname found.
//
// SOLUTION:
//   A) Patch dns.resolve4 / resolve6 / resolveSrv / resolveTxt to route
//      through the OS resolver (dns.lookup) for A/AAAA, and return
//      hardcoded answers for our known Atlas cluster's SRV/TXT records.
//   B) Also export rewriteSrvUri() that rewrites a mongodb+srv:// URI into
//      a direct mongodb:// URI listing all 3 shard hosts, bypassing SRV/TXT
//      DNS lookups entirely.
//
// This is SAFE to apply on ALL machines — no perf penalty.

import dns from 'dns'

// Prefer IPv4 across the board (avoids "try IPv6 first then time out" delays)
try {
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first')
  } else if (typeof dns.setResultOrder === 'function') {
    // Node 20+ alias
    dns.setResultOrder('ipv4first')
  }
} catch (_) {}

// ---------------------------------------------------------------------------
// Known Atlas cluster hardcoding for: dolifeelectric.yflcgd9.mongodb.net
// (Verified via live DNS lookup from the build sandbox.)
// If you ever migrate to a different Atlas cluster, just update these.
// ---------------------------------------------------------------------------
export const KNOWN_ATLAS_CLUSTERS = {
  'dolifeelectric.yflcgd9.mongodb.net': {
    srv: [
      { name: 'ac-zma64rm-shard-00-00.yflcgd9.mongodb.net', port: 27017, priority: 0, weight: 0 },
      { name: 'ac-zma64rm-shard-00-01.yflcgd9.mongodb.net', port: 27017, priority: 0, weight: 0 },
      { name: 'ac-zma64rm-shard-00-02.yflcgd9.mongodb.net', port: 27017, priority: 0, weight: 0 },
    ],
    txt: 'authSource=admin&replicaSet=atlas-zma64rm-shard-0',
    tls: true,
    retryWrites: true,
  },
}

patchResolve4and6()
patchSrvAndTxtForAtlas()

// ---------------------------------------------------------------------------
// Rewrite a mongodb+srv:// URI into a direct mongodb:// URI for any known
// cluster, bypassing SRV/TXT DNS entirely. Safe to call on any URI — if it
// doesn't match a known cluster it returns the input unchanged.
// ---------------------------------------------------------------------------
export function rewriteSrvUri(uri) {
  if (!uri || typeof uri !== 'string') return uri
  if (!uri.startsWith('mongodb+srv://')) return uri

  try {
    // Parse: mongodb+srv://user:pass@HOST/DB?params
    const rest = uri.slice('mongodb+srv://'.length)
    const atIdx = rest.lastIndexOf('@')
    if (atIdx === -1) return uri
    const userpass = rest.slice(0, atIdx)
    const afterAt = rest.slice(atIdx + 1)
    const [hostPartWithDb, ...queryParts] = afterAt.split('?')
    const slashIdx = hostPartWithDb.indexOf('/')
    const hostPart = slashIdx >= 0 ? hostPartWithDb.slice(0, slashIdx) : hostPartWithDb
    const dbPart = slashIdx >= 0 ? hostPartWithDb.slice(slashIdx + 1) : ''
    const existingQuery = queryParts.join('?')

    // hostPart might be "host" or "host:port" (srv URIs don't use port, but be safe)
    const hostOnly = hostPart.split(':')[0].toLowerCase()
    const known = KNOWN_ATLAS_CLUSTERS[hostOnly]
    if (!known) return uri

    // Build direct URI
    const directHosts = known.srv.map(r => `${r.name}:${r.port}`).join(',')
    const params = new URLSearchParams(existingQuery || '')
    // Apply TXT defaults if not already in URI
    const txtParams = new URLSearchParams(known.txt)
    for (const [k, v] of txtParams) {
      if (!params.has(k)) params.set(k, v)
    }
    if (known.tls && !params.has('tls') && !params.has('ssl')) params.set('tls', 'true')
    if (known.retryWrites && !params.has('retryWrites')) params.set('retryWrites', 'true')

    const queryStr = params.toString()
    let newUri = `mongodb://${userpass}@${directHosts}/`
    if (dbPart) newUri += dbPart
    if (queryStr) newUri += `?${queryStr}`
    return newUri
  } catch (_) {
    return uri
  }
}

// ---------------------------------------------------------------------------
// Patch resolve4 / resolve6 (callback + promises) to use dns.lookup (OS resolver)
// ---------------------------------------------------------------------------
function patchResolve4and6() {
  const LOOKUP_TIMEOUT_MS = 4000
  for (const [family, method] of [[4, 'resolve4'], [6, 'resolve6']]) {
    const orig = dns[method]
    function doLookup(hostname, options, callback) {
      // Try OS resolver with a timeout so we never hang
      let settled = false
      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        const err = new Error(`dns.lookup timed out after ${LOOKUP_TIMEOUT_MS}ms`)
        err.code = 'TIMEOUT'
        callback(err)
      }, LOOKUP_TIMEOUT_MS)
      dns.lookup(hostname, { family, all: true }, (err, addresses) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (err) return callback(err)
        const ttl = !!(options && options.ttl)
        if (ttl) callback(null, (addresses || []).map(a => ({ address: a.address, ttl: 0 })))
        else callback(null, (addresses || []).map(a => a.address))
      })
    }
    dns[method] = function patched(hostname, options, callback) {
      if (typeof options === 'function') { callback = options; options = {} }
      if (typeof callback === 'function') {
        // Try original c-ares first; if it fails quickly, fall back to OS lookup.
        let settled = false
        const fallbackTimer = setTimeout(() => {
          if (settled) return
          doLookup(hostname, options, callback)
        }, 600)
        try {
          orig.call(dns, hostname, options, (err, result) => {
            if (settled) return
            settled = true
            clearTimeout(fallbackTimer)
            if (err || !result || (Array.isArray(result) && result.length === 0)) {
              return doLookup(hostname, options, callback)
            }
            callback(null, result)
          })
        } catch (syncErr) {
          if (settled) return
          settled = true
          clearTimeout(fallbackTimer)
          doLookup(hostname, options, callback)
        }
        return
      }
      // Promise form
      return new Promise((resolve, reject) => {
        const cb = (err, result) => err ? reject(err) : resolve(result)
        dns[method].call(dns, hostname, options, cb)
      })
    }
    // Promise form
    if (dns.promises && dns.promises[method]) {
      const origP = dns.promises[method]
      dns.promises[method] = function patchedP(hostname, options) {
        return new Promise((resolve, reject) => {
          let settled = false
          const fallbackTimer = setTimeout(() => {
            if (settled) return
            doLookup(hostname, options, (err, result) => {
              if (settled) return
              settled = true
              if (err) reject(err)
              else resolve(result)
            })
          }, 600)
          try {
            origP.call(dns.promises, hostname, options)
              .then(r => {
                if (settled) return
                settled = true
                clearTimeout(fallbackTimer)
                if (!r || (Array.isArray(r) && r.length === 0)) {
                  return doLookup(hostname, options, (e, rr) => e ? reject(e) : resolve(rr))
                }
                resolve(r)
              })
              .catch(() => {
                if (settled) return
                settled = true
                clearTimeout(fallbackTimer)
                doLookup(hostname, options, (e, rr) => e ? reject(e) : resolve(rr))
              })
          } catch (syncErr) {
            if (settled) return
            settled = true
            clearTimeout(fallbackTimer)
            doLookup(hostname, options, (e, rr) => e ? reject(e) : resolve(rr))
          }
        })
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Patch resolveSrv / resolveTxt to answer for our known Atlas clusters
// ---------------------------------------------------------------------------
function patchSrvAndTxtForAtlas() {
  for (const [host, config] of Object.entries(KNOWN_ATLAS_CLUSTERS)) {
    patchOne('resolveSrv', `_mongodb._tcp.${host}`, config.srv, 1500)
    patchOne('resolveTxt', host, [[config.txt]], 1500)
  }
}

function patchOne(method, matchHost, hardcodedAnswer, timeoutMs = 1500) {
  const orig = dns[method]
  if (!orig) return
  const matchLower = matchHost.toLowerCase()
  dns[method] = function patched(hostname, callback) {
    const hn = (typeof hostname === 'string' ? hostname : '').replace(/\.$/, '').toLowerCase()
    const isMatch = hn === matchLower
    if (!isMatch || typeof callback !== 'function') {
      return orig.apply(dns, arguments)
    }
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      callback(null, hardcodedAnswer)
    }, timeoutMs)
    try {
      orig.call(dns, hostname, (err, result) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (err || !result || (Array.isArray(result) && result.length === 0)) {
          return callback(null, hardcodedAnswer)
        }
        callback(null, result)
      })
    } catch (_) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      callback(null, hardcodedAnswer)
    }
  }
  if (dns.promises && dns.promises[method]) {
    const origP = dns.promises[method]
    dns.promises[method] = function patchedP(hostname) {
      const hn = (typeof hostname === 'string' ? hostname : '').replace(/\.$/, '').toLowerCase()
      const isMatch = hn === matchLower
      if (!isMatch) return origP.call(dns.promises, hostname)
      return new Promise(resolve => {
        let settled = false
        const timer = setTimeout(() => {
          if (settled) return; settled = true
          resolve(hardcodedAnswer)
        }, timeoutMs)
        origP.call(dns.promises, hostname)
          .then(r => {
            if (settled) return; settled = true; clearTimeout(timer)
            if (!r || (Array.isArray(r) && r.length === 0)) resolve(hardcodedAnswer)
            else resolve(r)
          })
          .catch(() => {
            if (settled) return; settled = true; clearTimeout(timer)
            resolve(hardcodedAnswer)
          })
      })
    }
  }
}

export default function ensureDnsWorks() {
  return true
}
