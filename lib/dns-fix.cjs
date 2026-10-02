/* eslint-disable */
// lib/dns-fix.cjs
//
// DNS compatibility layer for Windows.
//
// Contains NO secrets, NO hostnames, NO cluster-specific data.
//
// PROBLEM:
// On Windows, antivirus/VPN/Hyper-V often leave a dead DNS proxy at 127.0.0.1
// in the system DNS server list. Node.js uses c-ares (a C library) for
// dns.resolveSrv / dns.resolveTxt, which the MongoDB driver needs to discover
// Atlas cluster hosts from mongodb+srv:// URIs. c-ares tries the dead proxy
// and gets ECONNREFUSED. Browsers use Windows' DoH/DNS Client which works fine.
//
// The dns.lookup() function (used by our mongoDnsLookup) uses getaddrinfo / OS
// resolver and works, BUT it only does A/AAAA records — it cannot do SRV or TXT
// queries. So family:4 and a custom `lookup` option only fixes the second half
// of resolution (connecting to individual shard hosts), not the SRV/TXT bootstrap.
//
// SOLUTION (layered, defense-in-depth):
//   1. with-dns.cjs applies dns.setServers() to the main Next process.
//   2. instrumentation.js (ROOT level, guarded by NEXT_RUNTIME === 'nodejs')
//      calls into this file to apply the full fix in every Node worker.
//   3. dbConnect.js / mongodb.js require this file as defense in depth.
//
// We do TWO things here:
//   a. Call dns.setServers(['8.8.8.8','1.1.1.1']) + ipv4first as a fast-path
//      override for c-ares.
//   b. MONKEY-PATCH dns.resolveSrv/resolveTxt (callback, promise, generic,
//      and the 'dns/promises' ESM namespace) to use DNS-over-HTTPS (DoH) over
//      HTTPS port 443, which passes through every antivirus, VPN and firewall.
//
// On Linux/macOS/Vercel (non-Windows) this file is a no-op.
//
// WHY CJS:
// Next.js compiles instrumentation.js for both Node.js and Edge runtimes. ESM
// `import dns from 'dns'` causes a hard webpack error in Edge builds because
// 'dns' is Node-only. CJS `require('dns')` is only a warning (webpack skips
// unresolvable CJS requires in Edge builds), matching how dns-preload.cjs
// already behaves.

let applied = false;
let readyPromise = null;

/**
 * Apply the DNS fix. Returns a Promise that resolves when the full patch
 * (including the async ESM-namespace fix) is installed. Safe to call multiple
 * times (idempotent) — subsequent calls return the same promise.
 */
function whenDnsReady() {
  if (applied) return readyPromise || Promise.resolve();
  applied = true;
  readyPromise = applyPatch().catch(err => {
    console.warn('⚠ [dns-fix] Failed to apply DoH patch:', err && err.message);
  });
  return readyPromise;
}

async function applyPatch() {
  // Non-Windows / non-Node: no-op
  if (process.platform !== 'win32') return;
  if (typeof require !== 'function') return;

  const dns = require('dns');
  const https = require('https');

  // --- Layer a: c-ares setServers (defense in depth, fast path) ---
  try {
    const servers = dns.getServers();
    const hasPublic = servers.some(s => s === '8.8.8.8' || s === '1.1.1.1');
    if (!hasPublic) {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    }
    if (typeof dns.setDefaultResultOrder === 'function') {
      dns.setDefaultResultOrder('ipv4first');
    } else if (typeof dns.setResultOrder === 'function') {
      dns.setResultOrder('ipv4first');
    }
  } catch (_) {}

  // --- Layer b: DoH monkey-patch for SRV/TXT ---
  const DOH_ENDPOINTS = [
    'https://cloudflare-dns.com/dns-query',
    'https://dns.google/resolve',
  ];
  const TYPE_SRV = 33;
  const TYPE_TXT = 16;

  function dohQuery(name, type) {
    return new Promise((resolve, reject) => {
      let idx = 0;
      function tryNext() {
        if (idx >= DOH_ENDPOINTS.length) {
          return reject(new Error('All DoH endpoints failed for ' + name));
        }
        const endpoint = DOH_ENDPOINTS[idx++];
        const url = endpoint + '?name=' + encodeURIComponent(name) + '&type=' + type;
        const req = https.get(url, {
          headers: { 'Accept': 'application/dns-json' },
          timeout: 5000,
        }, (res) => {
          if (res.statusCode !== 200) { res.resume(); return tryNext(); }
          let data = '';
          res.setEncoding('utf8');
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (json.Status !== 0 && json.Status !== undefined) {
                return reject(new Error('DoH returned status ' + json.Status));
              }
              resolve(json);
            } catch (_) { tryNext(); }
          });
        });
        req.on('error', tryNext);
        req.on('timeout', () => { req.destroy(); tryNext(); });
      }
      tryNext();
    });
  }

  function parseSrv(json) {
    return (json.Answer || []).filter(a => a.type === TYPE_SRV).map(a => {
      const parts = a.data.split(/\s+/);
      return {
        priority: parseInt(parts[0], 10),
        weight:   parseInt(parts[1], 10),
        port:     parseInt(parts[2], 10),
        name:     parts[3].replace(/\.$/, ''),
      };
    });
  }

  function parseTxt(json) {
    // dns.resolveTxt returns string[][] — each TXT record is an array of
    // character-string chunks (RFC 4408).
    return (json.Answer || []).filter(a => a.type === TYPE_TXT).map(a => {
      if (Array.isArray(a.data)) return a.data.map(String);
      const str = String(a.data);
      if (str.includes('"')) {
        const chunks = [];
        const re = /"([^"]*)"/g;
        let m;
        while ((m = re.exec(str)) !== null) chunks.push(m[1]);
        if (chunks.length > 0) return chunks;
      }
      return [str];
    });
  }

  // Capture originals (before we overwrite anything)
  const origResolveSrv = dns.resolveSrv;
  const origResolveTxt = dns.resolveTxt;
  const origResolve    = dns.resolve;

  const dnsPromises = dns.promises;
  const origPSolveSrv = dnsPromises.resolveSrv;
  const origPSolveTxt = dnsPromises.resolveTxt;
  const origPSolve    = dnsPromises.resolve;

  // Build wrappers
  function patchedResolveSrv(hostname, callback) {
    if (typeof callback !== 'function') {
      return origResolveSrv.call(dns, hostname, callback);
    }
    dohQuery(hostname, TYPE_SRV).then(json => {
      const recs = parseSrv(json);
      if (recs.length === 0) return origResolveSrv.call(dns, hostname, callback);
      callback(null, recs);
    }).catch(() => {
      origResolveSrv.call(dns, hostname, callback);
    });
  }

  function patchedResolveTxt(hostname, callback) {
    if (typeof callback !== 'function') {
      return origResolveTxt.call(dns, hostname, callback);
    }
    dohQuery(hostname, TYPE_TXT).then(json => {
      const recs = parseTxt(json);
      if (recs.length === 0) return origResolveTxt.call(dns, hostname, callback);
      callback(null, recs);
    }).catch(() => {
      origResolveTxt.call(dns, hostname, callback);
    });
  }

  async function patchedPSolveSrv(hostname) {
    try {
      const recs = parseSrv(await dohQuery(hostname, TYPE_SRV));
      if (recs.length > 0) return recs;
    } catch (_) {}
    return origPSolveSrv.call(dnsPromises, hostname);
  }

  async function patchedPSolveTxt(hostname) {
    try {
      const recs = parseTxt(await dohQuery(hostname, TYPE_TXT));
      if (recs.length > 0) return recs;
    } catch (_) {}
    return origPSolveTxt.call(dnsPromises, hostname);
  }

  function patchedResolve(hostname, rrtype, callback) {
    let type = rrtype, cb = callback;
    if (typeof rrtype === 'function') { cb = rrtype; type = 'A'; }
    if (type === 'SRV') return patchedResolveSrv(hostname, cb);
    if (type === 'TXT') return patchedResolveTxt(hostname, cb);
    return origResolve.call(dns, hostname, type, cb);
  }

  async function patchedPSolve(hostname, rrtype) {
    const type = rrtype || 'A';
    if (type === 'SRV') return patchedPSolveSrv(hostname);
    if (type === 'TXT') return patchedPSolveTxt(hostname);
    return origPSolve.call(dnsPromises, hostname, type);
  }

  // Install patches on dns and dns.promises
  dns.resolveSrv = patchedResolveSrv;
  dns.resolveTxt = patchedResolveTxt;
  dns.resolve    = patchedResolve;

  dnsPromises.resolveSrv = patchedPSolveSrv;
  dnsPromises.resolveTxt = patchedPSolveTxt;
  dnsPromises.resolve    = patchedPSolve;

  // Also patch the 'dns/promises' ESM sub-module namespace (MongoDB v6
  // driver does `import { resolveSrv } from 'dns/promises'`). In Node.js
  // the namespace object is the same as dns.promises in most versions,
  // but we dynamically import and redefine to be safe.
  try {
    // Use async import via createRequire / dynamic import for ESM compat.
    // Since this file is .cjs, we use a Promise-based dynamic import.
    const dp = await import('dns/promises');
    function assign(obj, key, val) {
      try {
        obj[key] = val;
      } catch (_) {
        try {
          Object.defineProperty(obj, key, {
            value: val, writable: true, configurable: true, enumerable: true,
          });
        } catch (_) {}
      }
    }
    assign(dp, 'resolveSrv', patchedPSolveSrv);
    assign(dp, 'resolveTxt', patchedPSolveTxt);
    assign(dp, 'resolve',    patchedPSolve);
    if (dp.default && dp.default !== dnsPromises) {
      assign(dp.default, 'resolveSrv', patchedPSolveSrv);
      assign(dp.default, 'resolveTxt', patchedPSolveTxt);
      assign(dp.default, 'resolve',    patchedPSolve);
    }
  } catch (_) {}

  console.log('🛡️  [dns-fix] DoH (DNS-over-HTTPS) monkey-patch active for SRV/TXT on Windows');
}

/**
 * OS-resolver lookup to pass to MongoClient/Mongoose as the `lookup` option.
 * Uses dns.lookup() (getaddrinfo / Windows OS resolver) instead of c-ares for
 * A/AAAA lookups. Bypasses any dead local DNS proxy that would otherwise break
 * c-ares. Signature matches what the MongoDB driver expects:
 *   lookup(hostname, options, callback)
 */
function mongoDnsLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  // Lazy-require dns at call time (safe — this function is only called on
  // Windows Node.js server processes, never in Edge/browser).
  const dns = require('dns');
  const family = typeof options === 'number' ? options : (options.family || 0);
  const hints = (options.hints || 0) | dns.ADDRCONFIG;
  const all = !!(options && options.all);
  dns.lookup(hostname, { family, hints, all, verbatim: false }, (err, address, famOrAddrs) => {
    if (err) return callback(err);
    callback(null, address, famOrAddrs);
  });
}

module.exports = {
  whenDnsReady,
  mongoDnsLookup,
  ensureDnsWorks: function ensureDnsWorks() { whenDnsReady(); return true; },
};
