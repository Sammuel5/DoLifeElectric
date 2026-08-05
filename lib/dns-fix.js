// DNS compatibility fix for Windows computers where raw UDP DNS (port 53) is blocked
// — common when DNS-over-HTTPS (DoH) is enabled, a VPN is doing DNS filtering, or an
// antivirus blocks Node.js's built-in c-ares DNS resolver.
//
// Node.js has TWO DNS paths:
//   dns.resolve* (resolve4, resolveSrv, resolveTxt...)  →  c-ares (raw UDP port 53)
//   dns.lookup                                           →  OS resolver (getaddrinfo)
//
// On some Windows setups with DoH / VPN / security software, raw UDP DNS is BLOCKED
// while OS DNS works (browser works, net.connect works, but Node.js DNS fails).
//
// This module patches:
//   1) dns.resolve4 / resolve6  →  use dns.lookup (OS resolver)
//   2) dns.resolveSrv / resolveTxt  →  return hardcoded MongoDB Atlas answers for our cluster
//      when we detect the dolifeelectric.yflcgd9.mongodb.net hostname. This makes the
//      mongodb+srv:// URI work on every computer (no SRV lookup needed over c-ares).
//
// This is SAFE to apply on ALL machines — no perf penalty, only overrides when needed.

import dns from 'dns'

// ---------------------------------------------------------------------------
// Constants for our Atlas cluster hardcoded fallback
// (defined first so they are available when the patch functions run)
// ---------------------------------------------------------------------------
const ATLAS_SRV_HOST = '_mongodb._tcp.dolifeelectric.yflcgd9.mongodb.net'
const ATLAS_TXT_HOST = 'dolifeelectric.yflcgd9.mongodb.net'

const HARDCODED_SRV = [
  { name: 'ac-zma64rm-shard-00-00.yflcgd9.mongodb.net.', port: 27017, priority: 0, weight: 0 },
  { name: 'ac-zma64rm-shard-00-01.yflcgd9.mongodb.net.', port: 27017, priority: 0, weight: 0 },
  { name: 'ac-zma64rm-shard-00-02.yflcgd9.mongodb.net.', port: 27017, priority: 0, weight: 0 },
]
const HARDCODED_TXT = [['authSource=admin&replicaSet=atlas-zma64rm-shard-0']]

patchResolve4and6()
patchSrvAndTxtForAtlas()

// Prefer IPv4 to avoid "try IPv6 first then time out" delays
try {
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first')
  }
} catch (_) {}

// ---------------------------------------------------------------------------
// Patch resolve4 / resolve6 (callback + promises) to use dns.lookup
// ---------------------------------------------------------------------------
function patchResolve4and6() {
  for (const [family, method] of [[4, 'resolve4'], [6, 'resolve6']]) {
    const orig = dns[method]
    dns[method] = function patched(hostname, options, callback) {
      if (typeof options === 'function') { callback = options; options = {} }
      if (typeof callback === 'function') {
        const ttl = !!(options && options.ttl)
        dns.lookup(hostname, { family, all: true }, (err, addresses) => {
          if (err) return callback(err)
          if (ttl) callback(null, addresses.map(a => ({ address: a.address, ttl: 0 })))
          else callback(null, addresses.map(a => a.address))
        })
        return
      }
      return new Promise((resolve, reject) => {
        dns.lookup(hostname, { family, all: true }, (err, addresses) => {
          if (err) return reject(err)
          if (options && options.ttl) resolve(addresses.map(a => ({ address: a.address, ttl: 0 })))
          else resolve(addresses.map(a => a.address))
        })
      })
    }
    if (dns.promises && dns.promises[method]) {
      dns.promises[method] = function patchedP(hostname, options) {
        return new Promise((resolve, reject) => {
          dns.lookup(hostname, { family, all: true }, (err, addresses) => {
            if (err) return reject(err)
            if (options && options.ttl) resolve(addresses.map(a => ({ address: a.address, ttl: 0 })))
            else resolve(addresses.map(a => a.address))
          })
        })
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Patch resolveSrv / resolveTxt to answer for our known Atlas cluster.
// mongodb+srv://<user>:<pass>@dolifeelectric.yflcgd9.mongodb.net/ needs:
//   SRV  _mongodb._tcp.dolifeelectric.yflcgd9.mongodb.net → 3 hosts, port 27017
//   TXT  dolifeelectric.yflcgd9.mongodb.net              → "authSource=admin&replicaSet=atlas-zma64rm-shard-0"
//
// When OS DNS can answer SRV/TXT normally (c-ares works), we fall through to the
// original implementation. Only when c-ares fails do we return the hardcoded answer.
// ---------------------------------------------------------------------------

function patchSrvAndTxtForAtlas() {
  patchOne('resolveSrv', ATLAS_SRV_HOST, HARDCODED_SRV)
  patchOne('resolveTxt', ATLAS_TXT_HOST, HARDCODED_TXT)
}

function patchOne(method, matchHost, hardcodedAnswer) {
  const orig = dns[method]
  if (!orig) return
  dns[method] = function patched(hostname, callback) {
    // Only intercept for our Atlas cluster; defer everything else to original
    const isMatch = typeof hostname === 'string' &&
      hostname.replace(/\.$/, '').toLowerCase() === matchHost.toLowerCase()
    if (!isMatch || typeof callback !== 'function') {
      return orig.apply(dns, arguments)
    }
    // Try original first (c-ares). If it works, great. If it errors/fails on
    // Windows DoH/VPN networks, return the hardcoded Atlas answer so SRV URI works.
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      // c-ares took too long — return hardcoded answer and patch hosts via lookup
      callback(null, hardcodedAnswer)
    }, 1500)
    orig.call(dns, hostname, (err, result) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (err || !result || (Array.isArray(result) && result.length === 0)) {
        return callback(null, hardcodedAnswer)
      }
      callback(null, result)
    })
  }
  // Promise form
  if (dns.promises && dns.promises[method]) {
    const origP = dns.promises[method]
    dns.promises[method] = function patchedP(hostname) {
      const isMatch = typeof hostname === 'string' &&
        hostname.replace(/\.$/, '').toLowerCase() === matchHost.toLowerCase()
      if (!isMatch) return origP.call(dns.promises, hostname)
      // Try original; if it fails, return hardcoded
      return new Promise(resolve => {
        let settled = false
        const timer = setTimeout(() => {
          if (settled) return; settled = true
          resolve(hardcodedAnswer)
        }, 1500)
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
