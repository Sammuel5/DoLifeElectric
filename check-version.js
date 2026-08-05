// Quick check script - run with: node check-version.js
const required = { node: '18.17.0', next: '14.0.0' };

const nodeVer = process.versions.node;
console.log('Your Node.js version:', nodeVer);
const nodeParts = nodeVer.split('.').map(Number);
const reqParts = required.node.split('.').map(Number);
let nodeOk = true;
for (let i = 0; i < 3; i++) {
  if (nodeParts[i] > reqParts[i]) break;
  if (nodeParts[i] < reqParts[i]) { nodeOk = false; break; }
}
if (!nodeOk) {
  console.log('\x1b[31m❌ ERROR: Your Node.js is too old! Please install Node 18.17+ or 20+ from https://nodejs.org/\x1b[0m');
  process.exit(1);
}
console.log('\x1b[32m✅ Node.js version OK\x1b[0m');

try {
  const nextPkg = require('next/package.json');
  console.log('Your Next.js version:', nextPkg.version);
  const nextMajor = parseInt(nextPkg.version.split('.')[0]);
  if (nextMajor < 13) {
    console.log('\x1b[31m❌ ERROR: Next.js is too old! Run: npm install next@14.2.5 --legacy-peer-deps\x1b[0m');
    process.exit(1);
  }
  console.log('\x1b[32m✅ Next.js version OK\x1b[0m');
} catch(e) {
  console.log('\x1b[33m⚠️  Next.js not installed yet. Run: npm install --legacy-peer-deps\x1b[0m');
}

console.log('\n\x1b[36mReady! Run: npm run dev\x1b[0m');
