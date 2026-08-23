/* eslint-disable */
// dns-preload.cjs — ROOT LEVEL
//
// Windows DNS fix for MongoDB Atlas SRV lookups.
//
// Applied from THREE places (defense-in-depth):
//   1. with-dns.cjs      (main Next process, before Next starts)
//   2. instrumentation.js (every Next server worker, inside register())
//   3. lib/dbConnect.js + lib/mongodb.js (right before connecting to Mongo)
//
// Does three things on Windows (no-op on Linux/macOS/Vercel):
//   (a) c-ares setServers(['8.8.8.8','1.1.1.1']) + ipv4first (fast path).
//   (b) Monkey-patches dns.resolveSrv/resolveTxt (callback + promise forms +
//       'dns/promises' ESM namespace) to use DNS-over-HTTPS on HTTPS/443.
//       This works through every antivirus, VPN, and firewall because
//       port 443 HTTPS is never blocked the way raw UDP DNS (port 53) is.
//   (c) Exports mongoDnsLookup (OS resolver via dns.lookup/getaddrinfo) for
//       the Mongo driver's `lookup` option, so A/AAAA lookups of shard
//       hosts also bypass c-ares.
//
// Safe to require() multiple times: the monkey-patching runs exactly once
// per process (guarded by global.__dleDnsPatched), but module.exports is
// ALWAYS set (webpack may evaluate this module multiple times in different
// compilation contexts; module.exports must be available every time).
//
// Contains NO secrets, hostnames, cluster data, or credentials.

'use strict';

// ---------------------------------------------------------------------------
// Build the exports object. This ALWAYS runs (even when patch is already
// applied) so webpack never sees an empty module.exports.
// ---------------------------------------------------------------------------

// Defaults (safe no-ops that work everywhere, including non-Windows).
let _whenDnsReady   = function () { return Promise.resolve(); };
let _mongoDnsLookup = undefined;
let _ensureDnsWorks = function () { return true; };

// Override with real implementations on Windows, ONCE per process.
if (process.platform === 'win32' && !global.__dleDnsPatched) {
  global.__dleDnsPatched = true;
  installPatch();
}

function installPatch() {
  try {
    const dns   = require('dns');
    const https = require('https');

    // ----- Layer (a): c-ares setServers (fast path) -----
    try {
      const servers = dns.getServers();
      const hasPublic = servers.some(s => s === '8.8.8.8' || s === '1.1.1.1');
      if (!hasPublic) dns.setServers(['8.8.8.8', '1.1.1.1']);
      if (typeof dns.setDefaultResultOrder === 'function') {
        dns.setDefaultResultOrder('ipv4first');
      } else if (typeof dns.setResultOrder === 'function') {
        dns.setResultOrder('ipv4first');
      }
    } catch (_) {}

    // ----- Layer (b): DoH monkey-patch for SRV/TXT -----
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
          const ep = DOH_ENDPOINTS[idx++];
          const url = ep + '?name=' + encodeURIComponent(name) + '&type=' + type;
          const req = https.get(url, {
            headers: { 'Accept': 'application/dns-json' },
            timeout: 5000,
          }, (res) => {
            if (res.statusCode !== 200) { res.resume(); return tryNext(); }
            let data = '';
            res.setEncoding('utf8');
            res.on('data', c => { data += c; });
            res.on('end', () => {
              try {
                const json = JSON.parse(data);
                if (json.Status !== 0 && json.Status !== undefined) {
                  return reject(new Error('DoH status ' + json.Status));
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
      // character-string chunks per RFC 4408.
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

    // Capture originals
    const origResolveSrv = dns.resolveSrv;
    const origResolveTxt = dns.resolveTxt;
    const origResolve    = dns.resolve;

    const dnsPromises = dns.promises;
    const origPSrv = dnsPromises.resolveSrv;
    const origPTxt = dnsPromises.resolveTxt;
    const origP    = dnsPromises.resolve;

    // Wrappers
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

    async function patchedPSrv(hostname) {
      try {
        const r = parseSrv(await dohQuery(hostname, TYPE_SRV));
        if (r.length > 0) return r;
      } catch (_) {}
      return origPSrv.call(dnsPromises, hostname);
    }

    async function patchedPTxt(hostname) {
      try {
        const r = parseTxt(await dohQuery(hostname, TYPE_TXT));
        if (r.length > 0) return r;
      } catch (_) {}
      return origPTxt.call(dnsPromises, hostname);
    }

    function patchedResolve(hostname, rrtype, callback) {
      let type = rrtype, cb = callback;
      if (typeof rrtype === 'function') { cb = rrtype; type = 'A'; }
      if (type === 'SRV') return patchedResolveSrv(hostname, cb);
      if (type === 'TXT') return patchedResolveTxt(hostname, cb);
      return origResolve.call(dns, hostname, type, cb);
    }

    async function patchedP(hostname, rrtype) {
      const type = rrtype || 'A';
      if (type === 'SRV') return patchedPSrv(hostname);
      if (type === 'TXT') return patchedPTxt(hostname);
      return origP.call(dnsPromises, hostname, type);
    }

    // Install synchronous patches immediately
    dns.resolveSrv = patchedResolveSrv;
    dns.resolveTxt = patchedResolveTxt;
    dns.resolve    = patchedResolve;

    dnsPromises.resolveSrv = patchedPSrv;
    dnsPromises.resolveTxt = patchedPTxt;
    dnsPromises.resolve    = patchedP;

    // ----- Layer (c): OS-resolver lookup for Mongo driver -----
    function mongoDnsLookup(hostname, options, callback) {
      if (typeof options === 'function') { callback = options; options = {}; }
      const family = typeof options === 'number' ? options : (options.family || 0);
      const hints = (options.hints || 0) | dns.ADDRCONFIG;
      const all = !!(options && options.all);
      dns.lookup(hostname, { family, hints, all, verbatim: false }, (err, address, fam) => {
        if (err) return callback(err);
        callback(null, address, fam);
      });
    }

    // whenDnsReady resolves after the async ESM-namespace patch finishes.
    // The synchronous patches above are already active; this is just so
    // callers can await the async part if they want to be extra sure.
    let readyResolve;
    const readyPromise = new Promise(r => { readyResolve = r; });

    // Patch 'dns/promises' ESM namespace asynchronously (best effort).
    (async function patchEsm() {
      try {
        const ns = await import('dns/promises');
        function assign(obj, key, val) {
          try { obj[key] = val; } catch (_) {
            try { Object.defineProperty(obj, key, { value: val, writable: true, configurable: true, enumerable: true }); }
            catch (_) {}
          }
        }
        assign(ns, 'resolveSrv', patchedPSrv);
        assign(ns, 'resolveTxt', patchedPTxt);
        assign(ns, 'resolve',    patchedP);
        if (ns.default && ns.default !== dnsPromises) {
          assign(ns.default, 'resolveSrv', patchedPSrv);
          assign(ns.default, 'resolveTxt', patchedPTxt);
          assign(ns.default, 'resolve',    patchedP);
        }
      } catch (_) {}
      // Log once per process
      console.log('🔧 [dns-fix] Windows DNS servers set to 8.8.8.8, 1.1.1.1');
      console.log('🛡️  [dns-fix] DoH (DNS-over-HTTPS) monkey-patch active for SRV/TXT on Windows');
      readyResolve();
    })();

    // Wire up real exports
    _whenDnsReady   = function () { return readyPromise; };
    _mongoDnsLookup = mongoDnsLookup;
    _ensureDnsWorks = function () { return true; };
  } catch (e) {
    console.warn('⚠ [dns-fix] Failed to apply DoH patch:', e && e.message);
  }
}

// ALWAYS set module.exports (webpack evaluates this module in multiple
// compilation contexts — exports must be available every single time,
// not just on the first evaluation when the patch installs).
module.exports = {
  whenDnsReady:   function () { return _whenDnsReady(); },
  mongoDnsLookup: _mongoDnsLookup,
  ensureDnsWorks: function () { return _ensureDnsWorks(); },
};
