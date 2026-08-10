# 🎤 DLE Entertainment — Do Life Electric

A full-stack Next.js 14 website for **DLE Entertainment**, built mobile-first for iOS and Android.

## ✨ Features

- 🎨 Dark theme with gold accent (#C9A84C) and Oswald display font (inspired by dle-entertainment.com)
- 👥 Browse artists & groups — click an artist to open video popup with their intro video
- 💝 Send gifts (🍱 Food, 👗 Clothes, 🎁 Gift, 💝 Cash) securely via **PayMongo** (supports Cards, GCash, Maya, GrabPay, BPI, UnionBank, 7-Eleven)
- 🔐 Google Sign-In required before payment (browsing is free)
- 🎵 Music streaming + downloads
- 🛡 Admin dashboard:
  - **Owner** (ssammuelbarrientos@gmail.com): can manage artists, music, gifts (edit/delete with ✕ button), and add/remove other admins
  - **Other admins**: can add/edit/delete artists and view gifts (read-only); cannot manage music, gifts, or other admins
- 🔍 Search on artists page, music page, and every admin tab
- 👪 Group system with clickable member name tags and duplicate-name prevention
- 📱 Mobile-optimized (2-column artist grid on phones → 6 on desktop)
- 📧 Contact form emails info@dle-entertainment.com (via Resend — free, 3k emails/month — with Nodemailer/SMTP fallback)
- 🔒 All payments go to ONE PayMongo account (single company wallet); owner manually distributes to artists

## 🔧 Tech Stack
- **Next.js 14.2.5** (pinned, App Router)
- **MongoDB Atlas** + **Mongoose**
- **NextAuth.js** with Google OAuth
- **PayMongo** (PH payments: Cards, GCash, Maya, GrabPay, banks, 7-Eleven) with HMAC webhook verification
- **Tailwind CSS**
- Deploy to **Vercel**

## 🚀 Quick Start

```bash
npm install --legacy-peer-deps
cp .env.example .env.local
# Edit .env.local — add your API keys (see TUTORIAL.md)
npm run dev
```

Open http://localhost:3000.

## 📖 Full Setup Guide

See **[TUTORIAL.md](./TUTORIAL.md)** for step-by-step: MongoDB Atlas, Google OAuth, PayMongo, webhooks, Vercel deployment.

Windows users: see **[SETUP_WINDOWS.md](./SETUP_WINDOWS.md)** for common fixes.

## 📂 Project Structure
```
app/
├── page.js               # Homepage (hero, featured artists, music CTA)
├── artists/              # Artists listing with search/filters
├── music/                # Public music page
├── about/, faq/, contact/, terms/, privacy/, login/
├── admin/                # Admin dashboard (artists/music/gifts/admins tabs)
└── api/
    ├── auth/[...nextauth]  # NextAuth Google sign-in
    ├── artists/          # CRUD artists & groups (admins only)
    ├── music/            # CRUD tracks (OWNER ONLY)
    ├── donations/        # Gift records (GET all for admins, POST create-session)
    ├── donations/create-session  # Create PayMongo Link (logged-in users)
    ├── webhooks/paymongo # PayMongo webhook (payment.paid / payment.failed)
    ├── admins/           # CRUD admin users (OWNER ONLY)
    ├── upload/           # File uploads (images/videos for all admins; audio owner only)
    ├── contact/          # Contact form email
    └── setup-status/     # Tells the setup banner what's configured

components/               # Navbar, Footer, VideoModal, GiftDonation, ArtistCard, MusicPlayer, etc.
lib/                      # dbConnect, auth (NextAuth + owner/admin roles), paymongo, mongodb
models/                   # Mongoose schemas: Artist, Music, Donation, Admin, Board
public/uploads/           # User-uploaded images/audio/videos
```

## 💸 Payments

All gifts are processed through **PayMongo**'s hosted checkout. Fans are redirected to PayMongo's secure payment page, then back to your site on success. PayMongo sends a signed webhook to `/api/webhooks/paymongo` to confirm payments (prevents fake donations). Money lands in your PayMongo wallet, then pays out to your bank account.

## 👤 Roles & Permissions

| Action | Owner (`OWNER_EMAIL`) | Other Admins | Fans |
|---|---|---|---|
| Browse artists/music | ✅ | ✅ | ✅ |
| Add/edit/delete artists | ✅ | ✅ | ❌ |
| Add/edit/delete music | ✅ | ❌ | ❌ |
| View gifts/revenue | ✅ | ✅ (read-only) | Own gifts only |
| Edit gift status | ✅ | ❌ | ❌ |
| Delete gift records (✕) | ✅ | ❌ | ❌ |
| Add/remove other admins | ✅ | ❌ | ❌ |
| Send gifts | ✅ | ✅ | ✅ (sign-in required) |

Per your request: **all donations flow into one DLE Entertainment company wallet via PayMongo**. You manually distribute funds to artists using the gifts tab as your record.

---

See **[TUTORIAL.md](./TUTORIAL.md)** to set up every API key and deploy! ⚡
