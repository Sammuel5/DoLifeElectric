# 📖 DLE Entertainment — Complete Setup & Deployment Tutorial

This guide walks you through getting **every API key**, running locally, and deploying to production so your website is live on the internet.

**Payment processor: PayMongo** (Philippines — supports Cards, GCash, Maya, GrabPay, BPI, UnionBank, 7-Eleven).

---

## 📋 Prerequisites
- A computer (Windows/Mac/Linux)
- A Google account
- A PayMongo account (Philippine business/individual — free to sign up)
- A bank account or e-wallet to receive payouts from PayMongo
- A credit card (for Vercel — free tier is enough to start)

---

## STEP 1: Get a MongoDB Database (Free)

1. Go to **https://www.mongodb.com/atlas/database**
2. Click **"Try Free"** → sign up with Google/email
3. Create a cluster (choose the **M0 FREE tier**, region `AWS Singapore (ap-southeast-1)`)
4. Wait 1–3 minutes for cluster to deploy
5. Click **"Connect"** → **"Drivers"** → choose **Node.js, version 4.x or later**
6. Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
7. Replace `<username>`/`<password>` with the DB user you created
8. Add database name before the `?`:
   ```
   mongodb+srv://youruser:yourpass@cluster0.xxxxx.mongodb.net/dle-entertainment?retryWrites=true&w=majority
   ```
9. In Network Access, add IP `0.0.0.0/0` (allow all).

✅ Save as `MONGODB_URI`.

---

## STEP 2: Get Google OAuth Keys (for Sign-In with Google)

1. Go to **https://console.cloud.google.com/**
2. Create a project named "DLE Entertainment"
3. Left sidebar → **APIs & Services** → **OAuth consent screen**
4. Choose **External** → **Create**
5. Fill in App name: `DLE Entertainment`, support email, developer email → **Save and Continue** (skip Scopes & Test users)
6. **Credentials** → **+ Create Credentials** → **OAuth client ID**
7. Application type: **Web application**, Name: `DLE Website`
8. Authorized JavaScript origins:
   - `http://localhost:3000`
   - `https://your-domain.com` (after deploy)
9. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-domain.com/api/auth/callback/google`
10. Click **Create** → copy Client ID and Client Secret.

✅ Save as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

---

## STEP 3: Set Up PayMongo (for Secure PH Payments)

PayMongo is the leading Philippine payment gateway — it supports Cards, GCash, Maya, GrabPay, BPI/UnionBank online banking, and 7-Eleven. All payments land in your PayMongo wallet, then you can payout to any PH bank account.

### 3.1 Create PayMongo Account
1. Go to **https://www.paymongo.com/**
2. Click **"Get started"** → sign up with email or Google
3. Complete your KYC/verification (you'll need a valid PH ID and bank/e-wallet details for payouts)
4. You can start testing right away in **Test mode** before verification completes

### 3.2 Get API Keys
1. Go to **https://dashboard.paymongo.com/developers**
2. You'll see two sets of keys:
   - **Public key** — starts with `pk_test_` (test) or `pk_live_` (live)
   - **Secret key** — starts with `sk_test_` (test) or `sk_live_` (live)
3. Copy both keys.
4. ⚠️ **Never share your secret key or commit it to GitHub.**

✅ Save as `PAYMONGO_PUBLIC_KEY` and `PAYMONGO_SECRET_KEY`.

### 3.3 Set Up PayMongo Webhook (Critical — tells your site "payment succeeded!")

The webhook is how PayMongo tells your server that a payment actually went through (without it, donations will always show as "pending").

**For production (after deploy — do this first on localhost during testing with ngrok):**

**Option A — Create via API (easiest):**

Run this in PowerShell (replace `YOUR_SECRET_KEY` and `YOUR_URL`):
```powershell
curl -X POST https://api.paymongo.com/v1/webhooks `
  -u "YOUR_SECRET_KEY:" `
  -H "Content-Type: application/json" `
  -d "{\"data\":{\"attributes\":{\"url\":\"https://YOUR-DOMAIN/api/webhooks/paymongo\",\"events\":[\"payment.paid\",\"payment.failed\",\"payment.refunded\",\"link.payment.paid\"]}}}"
```

**Option B — Use the PayMongo Dashboard (easiest for beginners):**
1. Go to **https://dashboard.paymongo.com/developers/webhooks**
2. Click **"Create webhook"**
3. URL: `https://YOUR-DOMAIN/api/webhooks/paymongo` (replace with your real domain — or ngrok URL for local testing)
4. Events to listen for — tick ALL four:
   - ✅ `payment.paid`
   - ✅ `payment.failed`
   - ✅ `payment.refunded`
   - ✅ `link.payment.paid`
5. Save. Copy the webhook secret (starts with `whsk_`).

After creation, the response JSON includes a `secret_key` starting with `whsk_`. That's your webhook secret.

✅ Save as `PAYMONGO_WEBHOOK_SECRET`.

**For local testing** (using ngrok like you did before):
```powershell
# Start ngrok
ngrok http 3000

# Create webhook pointing to your ngrok URL (run in another PowerShell):
curl -X POST https://api.paymongo.com/v1/webhooks -u "sk_test_xxxx:" -H "Content-Type: application/json" -d "{\"data\":{\"attributes\":{\"url\":\"https://YOUR-NGROK-URL/api/webhooks/paymongo\",\"events\":[\"payment.paid\",\"payment.failed\",\"payment.refunded\",\"link.payment.paid\"]}}}"
```

### 3.4 Test Cards & E-wallets (Test Mode)
- **Test card number**: `4242 4242 4242 4242` — any future date, any CVC, any ZIP
- **GCash/Maya test**: PayMongo's test mode shows a "Simulate success" button after redirect
- Test amounts start at ₱50 minimum recommended

---

## STEP 4: Set Up Email (Contact Form)

The contact form needs an email provider to deliver messages to `info@dle-entertainment.com`. You have two options.

### Option A — Resend (RECOMMENDED — easiest, free)

Resend is a developer-focused email service with a **free tier of 3,000 emails/month** (≈100/day). It works perfectly with Next.js and avoids Gmail's SMTP hassle.

1. Sign up at **https://resend.com** (use your Gmail — takes 30 seconds)
2. Go to **API Keys** → **Create API Key** → name it `dle-website`, permission "Sending access"
3. Copy the key (starts with `re_`)
4. Add to `.env.local`:
   ```
   CONTACT_EMAIL=info@dle-entertainment.com
   RESEND_API_KEY=re_your_key_here
   EMAIL_FROM=onboarding@resend.dev
   ```
5. **Important — Test mode limitation:** Until you verify a sending domain, Resend can only deliver emails TO the email address you signed up with (your Gmail). So set `CONTACT_EMAIL=ssammuelbarrientos@gmail.com` during testing, then switch to `info@dle-entertainment.com` after domain verification.
6. **For production** (after buying/connecting dle-entertainment.com):
   - In Resend → **Domains** → Add Domain → `dle-entertainment.com`
   - Add the DNS records Resend shows you (at your domain registrar)
   - Once verified, set `EMAIL_FROM=website@dle-entertainment.com` (or any `@dle-entertainment.com` address)
   - Set `CONTACT_EMAIL=info@dle-entertainment.com`

### Option B — Gmail SMTP with App Password (if you prefer)

⚠️ Regular Gmail passwords are **rejected** with error `535-5.7.8 Username and Password not accepted`. You must create a Gmail App Password:

1. Go to your Google Account → **Security**
2. Enable **2-Step Verification** (required for App Passwords)
3. Go to **https://myaccount.google.com/apppasswords**
4. Select app: **Mail**, device: **Other (Custom name)** → "DLE Website"
5. Copy the **16-character** App Password (no spaces)
6. Add to `.env.local`:
   ```
   CONTACT_EMAIL=info@dle-entertainment.com
   EMAIL_SERVER_HOST=smtp.gmail.com
   EMAIL_SERVER_PORT=587
   EMAIL_SERVER_USER=your-gmail@gmail.com
   EMAIL_SERVER_PASSWORD=your16charapppassword
   EMAIL_FROM=your-gmail@gmail.com
   ```
   (Do NOT set `RESEND_API_KEY` if using this option — Resend takes priority if both are set.)

💡 Without either setup, the form returns a clear error telling you to configure email.

---

## STEP 5: Run Locally

1. **Install Node.js** (v18+ LTS): https://nodejs.org/
2. Open PowerShell in the project folder:
   ```powershell
   cd dle-entertainment
   npm install --legacy-peer-deps
   ```
3. Create `.env.local` (copy from `.env.example`):
   ```powershell
   copy .env.example .env.local
   notepad .env.local
   ```
4. Fill in `.env.local`:
   ```
   MONGODB_URI=mongodb+srv://...
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=<run: node -e "console.log(crypto.randomBytes(32).toString('base64'))">
   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxx

   PAYMONGO_SECRET_KEY=sk_test_xxxx
   PAYMONGO_PUBLIC_KEY=pk_test_xxxx
   PAYMONGO_WEBHOOK_SECRET=whsk_xxxx

   OWNER_EMAIL=ssammuelbarrientos@gmail.com
   ADMIN_EMAILS=
   ```
   > To generate NEXTAUTH_SECRET, run:
   > `node -e "console.log(crypto.randomBytes(32).toString('base64'))"`

5. **OWNER_EMAIL must be your Gmail address.** This account is the SUPER ADMIN / OWNER.

6. Start dev server:
   ```powershell
   npm run dev
   ```
7. Open **http://localhost:3000** in your browser. If using ngrok for phone testing, open your ngrok URL too.

### Testing a Donation
- Make sure PayMongo is in **Test mode** (use `sk_test_` key)
- Sign in with Google
- Click an artist → watch intro video → click **🎁 Gifts**
- Choose gift type (Food/Clothes/Gift/Money)
- Choose preset amount or type custom amount in PHP
- Click "Pay ₱XXX Securely" → redirects to PayMongo's hosted checkout
- PayMongo shows payment options: Card, GCash, Maya, GrabPay, Banks, 7-Eleven
- Use test card `4242 4242 4242 4242` to complete
- After payment you're redirected back; the donation appears in your **Admin → Gifts** tab as "completed" (once webhook fires)

---

## STEP 6: Seed Sample Data (Optional)

Sign in as owner, visit `/admin`, then use the Artists tab to add artists and Music tab (owner only) to upload tracks.

---

## STEP 7: Deploy to Vercel

### 7.1 Push to GitHub
```powershell
git init
git add .
git commit -m "Initial DLE Entertainment website"
git branch -M main
git remote add origin https://github.com/yourname/dle-entertainment.git
git push -u origin main
```

### 7.2 Deploy on Vercel
1. Go to **https://vercel.com/signup** → sign up with GitHub
2. **Add New Project** → import your repo
3. Environment Variables (paste from `.env.local`):
   - `MONGODB_URI`
   - `NEXTAUTH_URL` = `https://your-domain.vercel.app`
   - `NEXTAUTH_SECRET`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `PAYMONGO_SECRET_KEY` (use `sk_live_` for production)
   - `PAYMONGO_PUBLIC_KEY` (use `pk_live_` for production)
   - `PAYMONGO_WEBHOOK_SECRET` (create production webhook first — see below)
   - `OWNER_EMAIL` = **ssammuelbarrientos@gmail.com**
   - `ADMIN_EMAILS` (leave blank)
   - EMAIL_* (optional)
4. Click **Deploy** → wait ~2 minutes.

### 7.3 Update OAuth & Webhook URLs
1. **Google Cloud Console** → Credentials → add:
   - Origin: `https://your-domain.vercel.app`
   - Redirect: `https://your-domain.vercel.app/api/auth/callback/google`
2. **Create PayMongo production webhook** pointing to:
   - `https://your-domain.vercel.app/api/webhooks/paymongo`
   - Events: `payment.paid`, `payment.failed`, `payment.refunded`, `link.payment.paid`
   - Copy the returned `whsk_...` secret into Vercel's `PAYMONGO_WEBHOOK_SECRET`
3. MongoDB Atlas → Network Access → confirm `0.0.0.0/0` is allowed.
4. **Switch PayMongo keys to live** (`sk_live_` / `pk_live_`) in Vercel env vars when ready for real money.

### 7.4 Custom Domain (optional)
Vercel → Project → Settings → Domains → add `dle-entertainment.com` → follow DNS instructions. Remember to update `NEXTAUTH_URL`, Google OAuth origins, and PayMongo webhook URL.

---

## STEP 8: Using the Admin Dashboard

Sign in with `ssammuelbarrientos@gmail.com` (owner) → click **Admin**.

**Artists tab** (all admins can use):
- Add/edit/delete artists & groups, upload images/videos.

**Music tab** (OWNER ONLY):
- Upload MP3s, cover art; add/edit/delete tracks. Tab is hidden from other admins.

**Gifts tab** (all admins view; only OWNER edits/deletes):
- See all donations with fan name, email, artist, gift type, PHP amount, and status.
- Owner: click colored status badge to change status, click **✕** to delete a record.
- Other admins: view-only.

**Admins tab** (OWNER ONLY):
- Enter a Gmail → **Grant Admin Access** to give someone admin rights.
- Click 🚫 to revoke access.
- Admins you add can manage artists and view gifts — but NOT music, gifts, or other admins.

---

## 🔒 Security Features

| Feature | Protection |
|---|---|
| HTTPS (Vercel auto) | Encrypted data in transit |
| PayMongo hosted checkout | You never see credit card numbers (PCI-compliant) |
| PayMongo webhook HMAC signature verification | Prevents fake payment notifications |
| NextAuth.js JWT + Google OAuth | Secure sessions, no password database |
| Owner vs Admin roles | Owner-only actions: add admins, manage music, edit/delete gifts |
| Server-side input validation | Blocks invalid/malicious donations |
| CSRF protection (NextAuth) | Prevents cross-site request forgery |
| Amount limits (₱1 – ₱100,000) | Prevents abuse |
| Authentication required before payment | Stops anonymous fraudulent charges |
| BSP-licensed payment processor | PayMongo is regulated by the Bangko Sentral ng Pilipinas |

---

## 📱 Mobile Testing
- Open your ngrok or Vercel URL on iPhone Safari / Android Chrome
- Site is fully responsive — video modals, PayMongo checkout, music player, and admin all work on mobile
- Add to Home Screen for app-like experience

---

## 🐛 Troubleshooting

| Problem | Fix |
|---|---|
| "MONGODB_URI not defined" | Ensure `.env.local` has the variable; restart server |
| Google sign-in fails | Check redirect URI in Google Console exactly matches |
| Payments stuck on "pending" | Webhook not set up or `PAYMONGO_WEBHOOK_SECRET` wrong — verify webhook URL is `/api/webhooks/paymongo` and events include `payment.paid` |
| "Access Denied" on admin | Sign in with the owner email or ask the owner to add you via the Admins tab |
| Contact form: "535-5.7.8 Username and Password not accepted" (gsmtp) | Gmail rejected your login. Use **Resend** (Option A above) — easiest fix. Or enable 2-Step Verification and create a Gmail **App Password** (regular Gmail passwords no longer work for SMTP). See STEP 4. |
| Contact form: "Email is not configured yet" | Set `RESEND_API_KEY` (recommended) or the SMTP variables in `.env.local` (see STEP 4) |
| Resend: "You can only send testing emails to your own email address" | You're in test mode — set `CONTACT_EMAIL` to the Gmail you signed up to Resend with, or add + verify `dle-entertainment.com` as a domain in Resend |
| "Forbidden: only the owner" | You're signed in with a non-owner email; use `ssammuelbarrientos@gmail.com` |
| PayMongo says "amount is invalid" | Amounts must be in centavos (integers); the code handles this automatically |
| Videos don't play on iPhone | MP4 must be H.264 encoded; use HandBrake to convert |
| Uploads don't work on Vercel | Vercel filesystem is ephemeral — paste Cloudinary/YouTube URLs or use Vercel Blob |

**After ANY code change on Windows, clear the Next cache:**
```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

---

## 🎉 You're Live!

Fans can:
1. Browse artists
2. Click an artist → watch opening video
3. Click **🎁 Gifts** → choose type (🍱 Food / 👗 Clothes / 🎁 Gift / 💝 Cash)
4. Pick amount in PHP → sign in with Google
5. Pay securely via PayMongo (Card, GCash, Maya, GrabPay, BPI, UBP, 7-Eleven)
6. Money lands in your PayMongo wallet → payout to your bank
7. You distribute manually to artists using the Gifts tab as your record

---

## 📞 Need Help?
- Vercel Docs: https://vercel.com/docs
- PayMongo Docs: https://docs.paymongo.com/
- PayMongo Dashboard: https://dashboard.paymongo.com/
- NextAuth Docs: https://next-auth.js.org/
- MongoDB Atlas: https://www.mongodb.com/docs/atlas/

Good luck with DLE Entertainment! ⚡
