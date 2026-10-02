// instrumentation.js — runs FIRST in every Next.js server process/worker.
// Location: project ROOT (same level as app/ and package.json). Required by
// Next.js for the experimental.instrumentationHook to fire correctly.
//
// Next.js compiles this file for BOTH Node.js and Edge runtimes. We guard
// all Node-only work behind process.env.NEXT_RUNTIME === 'nodejs' and
// require() the root-level dns-preload.cjs (which webpack treats as an
// external/warning rather than a hard error because it's preloaded by
// with-dns.cjs before Next starts).
//
// We do NOT use top-level imports of Node-only modules here, because that
// would make webpack fail when compiling for the Edge runtime.

export async function register() {
  // Only patch in Node.js server processes (not Edge runtime, not browser).
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Only patch DNS on Windows where the antivirus/VPN/Hyper-V DNS bug exists.
  if (process.platform !== 'win32') return;

  // Apply DNS fix (c-ares setServers + DoH monkey-patch for SRV/TXT).
  // dns-preload.cjs is root-level and idempotent — safe to require again.
  // We use require() (not import) so webpack's Edge analyzer treats it as
  // a CJS external (warning only, not hard error) — same as it already
  // did successfully for this file in your previous run.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dnsFix = require('./dns-preload.cjs');
    if (dnsFix && typeof dnsFix.whenDnsReady === 'function') {
      await dnsFix.whenDnsReady();
    }
  } catch (e) {
    console.warn('⚠ dns-preload failed to load in instrumentation:', e && e.message);
  }
}
