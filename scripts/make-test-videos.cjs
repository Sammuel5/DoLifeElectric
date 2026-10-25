/**
 * Generate tiny valid MP4 placeholder files for local testing.
 * These 2-second silent black videos let you verify the video player
 * works end-to-end before you record your real thank-you clips.
 *
 * Requires ffmpeg (system install). If ffmpeg isn't available, writes
 * a README with a download link instead of fake/empty files.
 *
 * Usage:  node scripts/make-test-videos.cjs
 */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const OUT_DIR = path.join(__dirname, '..', 'public', 'uploads', 'thanks')
fs.mkdirSync(OUT_DIR, { recursive: true })

const targets = [
  { name: 'tier-high', label: 'HIGH TIER - Gold Supporter' },
  { name: 'tier-mid',  label: 'MID TIER - Star Fan' },
  { name: 'tier-low',  label: 'LOW TIER' },
  { name: 'zenyx',     label: 'ZENYX Group' },
  { name: 'dle',       label: 'DLE Entertainment' },
]

// Check ffmpeg
let hasFfmpeg = false
try {
  execSync('ffmpeg -version', { stdio: 'ignore' })
  hasFfmpeg = true
} catch (_) { hasFfmpeg = false }

if (!hasFfmpeg) {
  console.log('ffmpeg not found. Writing placeholder README instead of videos.\n')
  const readme = `To generate test videos locally, install ffmpeg:\n  - macOS:   brew install ffmpeg\n  - Windows: choco install ffmpeg  (or download from https://ffmpeg.org)\n  - Linux:   sudo apt install ffmpeg\n\nThen run:\n  node scripts/make-test-videos.cjs\n\nOr just drop your own MP4 files into this folder named:\n  tier-high.mp4, tier-mid.mp4, tier-low.mp4, zenyx.mp4\n\nSee ../../THANKS_VIDEOS_SETUP.md for full instructions.\n`
  fs.writeFileSync(path.join(OUT_DIR, 'README.txt'), readme)
  console.log('Wrote README.txt to', OUT_DIR)
  process.exit(0)
}

for (const t of targets) {
  const out = path.join(OUT_DIR, `${t.name}.mp4`)
  if (fs.existsSync(out) && fs.statSync(out).size > 10000) {
    console.log(`  skip (exists): ${t.name}.mp4`)
    continue
  }
  // 2-second, 640x360, dark background with centered gold text "TEST - {label}"
  const cmd = [
    'ffmpeg -y',
    '-f lavfi -i color=c=#0a0a0a:s=640x360:d=2:r=24',
    `-vf "drawtext=text='${t.label}':fontcolor=0xC9A84C:fontsize=28:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=0x000000@0.0"`,
    '-c:v libx264 -pix_fmt yuv420p -profile:v baseline -level 3.0 -b:v 300k',
    '-an',
    `-t 2 "${out}"`,
  ].join(' ')
  try {
    execSync(cmd, { stdio: 'ignore' })
    console.log(`  created: ${t.name}.mp4 (${(fs.statSync(out).size/1024).toFixed(0)} KB)`)
  } catch (e) {
    console.log(`  FAILED: ${t.name}.mp4 —`, e.message.split('\n')[0])
  }
}

console.log('\nDone. Restart npm run dev and send a gift to test.')
