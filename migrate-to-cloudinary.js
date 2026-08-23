/**
 * Migrate existing local /public/uploads/ files to Cloudinary.
 *
 * Run AFTER adding CLOUDINARY_URL to .env.local (or set it as an env var):
 *   CLOUDINARY_URL=cloudinary://key:secret@cloud node migrate-to-cloudinary.js
 *
 * This script:
 *  1. Finds every image/audio/video under public/uploads/*
 *  2. Uploads it to Cloudinary (dle-entertainment/<images|audio|videos>/...)
 *  3. Writes cloudinary-migration-map.json with { "/uploads/...": "https://res.cloudinary.com/..." }
 */
'use strict'
const fs = require('fs')
const path = require('path')

// ── Minimal .env.local loader (no dotenv dep needed) ──
try {
  const envPath = path.join(__dirname, '.env.local')
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (m && !process.env[m[1]]) {
        let v = m[2]
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
        process.env[m[1]] = v
      }
    })
  }
} catch (_) {}

// ── Load Cloudinary ──
let cloudinary
try {
  cloudinary = require('cloudinary').v2
} catch (e) {
  console.error('❌ cloudinary package not installed. Run: npm i cloudinary')
  process.exit(1)
}

if (!process.env.CLOUDINARY_URL && !process.env.CLOUDINARY_CLOUD_NAME) {
  console.error('❌ CLOUDINARY_URL not set. Add it to .env.local first.')
  console.error('   (copy the "API Environment variable" from your Cloudinary Dashboard)')
  process.exit(1)
}

if (process.env.CLOUDINARY_URL) {
  // cloudinary auto-configures from CLOUDINARY_URL
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure:     true,
  })
}

const ROOT = path.join(__dirname, 'public', 'uploads')
const FOLDERS = ['images', 'audio', 'videos']

function resourceTypeFor(folder) {
  if (folder === 'audio' || folder === 'videos') return 'video'
  return 'image'
}

async function uploadFile(folder, filename) {
  const fullPath = path.join(ROOT, folder, filename)
  let stat
  try { stat = fs.statSync(fullPath) } catch (_) { return null }
  if (!stat.isFile()) return null

  const cleanName = filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
  const publicId = `${Date.now()}-${cleanName}`
  const localUrl = `/uploads/${folder}/${filename}`

  return new Promise((resolve) => {
    cloudinary.uploader.upload(
      fullPath,
      {
        folder: `dle-entertainment/${folder}`,
        public_id: publicId,
        resource_type: resourceTypeFor(folder),
        secure: true,
        use_filename: true,
        unique_filename: true,
      },
      (err, result) => {
        if (err || !result) {
          console.error(`  ❌ ${filename}:`, err?.message || err)
          return resolve(null)
        }
        // Optimize: insert f_auto,q_auto for images
        let url = result.secure_url
        if (resourceTypeFor(folder) === 'image') {
          const parts = url.split('/')
          const ui = parts.indexOf('upload')
          if (ui !== -1) parts.splice(ui + 1, 0, 'f_auto,q_auto')
          url = parts.join('/')
        }
        resolve({ localUrl, cloudUrl: url, bytes: result.bytes })
      }
    )
  })
}

;(async () => {
  console.log('🚀 Migrating local uploads → Cloudinary\n')
  const map = {}
  let total = 0
  let migrated = 0
  let failed = 0
  let skipped = 0

  for (const folder of FOLDERS) {
    const dir = path.join(ROOT, folder)
    if (!fs.existsSync(dir)) {
      console.log(`  ℹ️  Skipping ${folder}/ (folder doesn't exist yet — that's fine)`)
      continue
    }
    const files = fs.readdirSync(dir).filter(f => !f.startsWith('.'))
    if (files.length === 0) {
      console.log(`  📂 ${folder}/ — empty (nothing to migrate)`)
      continue
    }
    console.log(`📁 ${folder}/ — ${files.length} file(s)`)
    for (const f of files) {
      total++
      const res = await uploadFile(folder, f)
      if (res) {
        map[res.localUrl] = res.cloudUrl
        migrated++
        const kb = Math.round(res.bytes / 1024)
        console.log(`  ✅ ${f}  (${kb > 1024 ? (kb/1024).toFixed(1) + ' MB' : kb + ' KB'})`)
      } else {
        failed++
      }
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`Done: ${migrated} migrated, ${failed} failed, ${skipped} skipped, ${total} total`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  if (migrated > 0) {
    const outPath = path.join(__dirname, 'cloudinary-migration-map.json')
    fs.writeFileSync(outPath, JSON.stringify(map, null, 2))
    console.log(`📝 URL map saved to: ${outPath}`)
    console.log(`   This maps old /uploads/... URLs → new Cloudinary URLs.\n`)
    console.log(`   IMPORTANT: You need to update existing records in MongoDB so old`)
    console.log(`   track covers / artist images / audio links point to Cloudinary.`)
    console.log(`   Easiest way: open each artist/track in the admin UI, re-pick or`)
    console.log(`   re-upload the file once, and save. New uploads automatically use`)
    console.log(`   Cloudinary from now on.\n`)
  } else {
    console.log(`ℹ️  No local files found to migrate. New uploads through the admin`)
    console.log(`   panel will automatically go to Cloudinary from now on.\n`)
  }
})()
