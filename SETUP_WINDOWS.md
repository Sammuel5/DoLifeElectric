# 🪟 WINDOWS SETUP — Fix for Errors & Complete Setup

## 🔑 Important: OWNER (You) vs Other Admins

- **You (ssammuelbarrientos@gmail.com)** are the OWNER / SUPER ADMIN. Set `OWNER_EMAIL=ssammuelbarrientos@gmail.com` in `.env.local`.
- Only YOU can:
  - Add or remove other admin users (**Admins tab**)
  - Add/edit/delete **Music** (hidden from other admins)
  - Edit gift statuses & delete gifts (✕ button on Gifts tab)
- **Other admins** can only:
  - Add/edit/delete **Artists** (and groups, images/videos)
  - VIEW gifts (read-only)
- They do NOT see the Music or Admins tabs.

## 💳 Payment Processor: PayMongo (Philippines)
Stripe has been replaced with **PayMongo** (BSP-licensed, supports Cards, GCash, Maya, GrabPay, BPI, UnionBank, 7-Eleven). You need:
- `PAYMONGO_SECRET_KEY` (from https://dashboard.paymongo.com/developers)
- `PAYMONGO_PUBLIC_KEY`
- `PAYMONGO_WEBHOOK_SECRET` (after creating a webhook pointing to `/api/webhooks/paymongo`)
- Currency is **PHP (₱)**, amounts in centavos (₱100 = 10000).

---

## 🚨 If you already have the project open and it's crashing:

### STEP 0: Stop the server
Press **Ctrl+C** in PowerShell.

### STEP 0.5: Use Node.js 20 LTS (RECOMMENDED)
Next.js 14 is officially supported on **Node.js 18.17+ or 20 LTS**.
If you have Node 22 or 24, you may hit weird TLS / OpenSSL issues with MongoDB Atlas.
- Check your version: `node --version`
- If it shows v22/v23/v24, download **Node.js 20 LTS** from https://nodejs.org/ and install it (it will replace the newer version). Then re-run `npm install --legacy-peer-deps`.

### STEP 1: Install correct Next.js version (14.2.5)
```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue

node --version  # must be 18.17+ or 20+
npm install --legacy-peer-deps
npx next --version  # should show Next.js v14.2.5
```

### STEP 2: Create your .env.local
```powershell
copy .env.example .env.local
notepad .env.local
```

**Minimum working `.env.local` for UI testing:**
```env
MONGODB_URI=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=paste_generated_secret_here
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
PAYMONGO_SECRET_KEY=
PAYMONGO_PUBLIC_KEY=
PAYMONGO_WEBHOOK_SECRET=
OWNER_EMAIL=ssammuelbarrientos@gmail.com
ADMIN_EMAILS=
```

Generate NEXTAUTH_SECRET:
```powershell
node -e "console.log(crypto.randomBytes(32).toString('base64'))"
```

### STEP 3: Start the server
```powershell
npm run dev
```
Open http://localhost:3000. You should see the homepage; the yellow setup banner tells you what's missing.

---

## 📋 Full setup — follow TUTORIAL.md Steps 1–4:
1. **MongoDB Atlas** (Step 1) → paste connection string into `MONGODB_URI`
2. **Google OAuth** (Step 2) → client ID + secret, add redirect URI `http://localhost:3000/api/auth/callback/google`
3. **PayMongo** (Step 3) →
   - Sign up at https://www.paymongo.com/
   - Copy API keys from dashboard.paymongo.com/developers
   - Create webhook via curl (see TUTORIAL.md Step 3.3)
4. **Restart server** after saving .env.local (Ctrl+C then `npm run dev`)

---

## 🎯 Quick test after everything is set up:
1. http://localhost:3000 loads without the yellow banner
2. Click **Sign In** → Google sign-in works
3. Go to **/admin** → you see 4 tabs (Artists, Music, Gifts, Admins) with the 👑 OWNER badge
4. Click an artist → video opens → click **Gifts** → donation flow redirects to PayMongo checkout
5. Test payment with card `4242 4242 4242 4242`

---

## ❓ Troubleshooting

### "URI must include hostname" error
→ MONGODB_URI is empty or malformed. Format:
`mongodb+srv://user:pass@cluster0.xxx.mongodb.net/dle-entertainment?retryWrites=true&w=majority`

### "Unexpected token '<'" error
→ Run `npm install --legacy-peer-deps` again after deleting node_modules.

### Payments stay "pending" forever
→ Webhook not set up. Create a PayMongo webhook pointing to `/api/webhooks/paymongo` with events `payment.paid` and `payment.failed`, and set `PAYMONGO_WEBHOOK_SECRET`.

### "Forbidden: only the owner" when deleting gifts
→ You're not signed in with `OWNER_EMAIL`. Sign out and back in with `ssammuelbarrientos@gmail.com`.

### Music tab is missing
→ Normal for non-owner admins. Only the owner sees the Music tab.

### Permission errors on Windows
Run PowerShell as Administrator, or:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
Then press Y.

---

## 🔴 MongoDB "Server selection timed out" on second computer

If `node test-db.js` shows ✅ DNS and ✅ TCP but ❌ step 3 (Mongo auth) times out, it means
**TLS/SSL is being intercepted** on that PC — TCP connects, but the encrypted MongoDB
handshake is being blocked or tampered with. This is almost always your antivirus.

### Run the 4-step diagnostic first:
```powershell
node test-db.js
```
This tests DNS → TCP → TLS handshake → Mongo auth (replica-set mode, direct mode, and
skip-cert-check mode) and tells you exactly where it fails.

### Fix checklist (in order):

1. **Disable antivirus "Web Shield" / "HTTPS Scanning" / "SSL Inspection"** (THE #1 FIX):
   - **Avast / AVG**: Settings → Protection → Core Shields → turn off **Web Shield**
   - **Kaspersky**: Settings → Network → uncheck **"Scan encrypted connections"**
   - **Bitdefender**: Settings → Privacy → Online Threat Prevention → turn off **"Encrypted Web Scan"**
   - **McAfee**: Turn off **Web Boost** / **Secure VPN**
   - **Windows Defender**:
     - Settings → Privacy & security → Windows Security → App & browser control → Reputation-based protection → turn off "Potentially unwanted app blocking"
     - Settings → Privacy & security → Windows Security → Device Security → Core isolation → turn off "Memory integrity" (reboot after)

2. **Try your PHONE'S MOBILE HOTSPOT**:
   - Turn on mobile hotspot on your phone
   - Connect your PC to the phone's WiFi
   - Re-run `node test-db.js`
   - If it works, your home router/ISP is filtering port 27017 TLS traffic.

3. **Disconnect any VPN** (VPNs commonly break Atlas TLS handshakes).

4. **Even if local dev doesn't work on this PC, VERCEL PRODUCTION WILL WORK.**
   - Vercel's servers have clean outbound TLS with no antivirus in the way.
   - You can keep developing on your main (working) laptop, push to GitHub, and Vercel auto-deploys.
   - The second PC can still be used for UI/preview testing (pages load; database features will show errors until the antivirus issue is fixed).

