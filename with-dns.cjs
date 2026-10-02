/* eslint-disable */
// with-dns.cjs — entry point for npm run dev/build/start.
//
// Why this wrapper exists:
//   On Windows, antivirus/VPN/Hyper-V often leave a dead DNS proxy at
//   127.0.0.1 in the system DNS list. This breaks Node's c-ares resolver
//   (which the MongoDB driver uses for SRV lookups on mongodb+srv:// URIs)
//   with ECONNREFUSED, even though browsers work fine.
//
//   We force public DNS servers (8.8.8.8 / 1.1.1.1) AND install a
//   DNS-over-HTTPS monkey-patch in THREE places to guarantee coverage
//   across every Node process Next.js spawns:
//     1. Right here, before requiring Next.js (main dev/build/start process).
//     2. In instrumentation.js (project ROOT) — Next.js runs this automatically
//        in EVERY server process/worker via the instrumentationHook.
//     3. In lib/dbConnect.js and lib/mongodb.js as a final defense-in-depth,
//        right before mongoose.connect / MongoClient.connect.
//
// All three entry points require() the same root-level dns-preload.cjs, which
// is idempotent (installs exactly once per process).
//
// No NODE_OPTIONS --require trickery (which fails on Windows when the
// project path has spaces — e.g. "Do Life Electric Arena").
// This file contains no credentials, no hostnames, no cluster data.

const path = require('path');

// Apply DNS fix in the main process immediately
try {
  require('./dns-preload.cjs');
} catch (e) {
  console.warn('⚠ DNS preload failed:', e.message);
}

// Also force ipv4first for the main process
try {
  const dns = require('dns');
  if (process.platform === 'win32') {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  }
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (_) {}

// Parse command
const args = process.argv.slice(2);
const command = args[0] || 'dev';
const nextArgs = args.slice(1);

const validCommands = ['dev', 'build', 'start', 'lint'];
if (!validCommands.includes(command)) {
  console.error(`Unknown command: "${command}". Expected one of: ${validCommands.join(', ')}`);
  console.error('Usage: node with-dns.cjs <dev|build|start|lint> [next-args...]');
  process.exit(1);
}

// Forward to Next.js CLI
process.argv = [
  process.execPath,
  require.resolve('next/dist/bin/next'),
  command,
  ...nextArgs,
];

require('next/dist/bin/next');
