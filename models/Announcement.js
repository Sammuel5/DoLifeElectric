import mongoose from 'mongoose'

/**
 * Announcement (site-wide pop-up).
 *
 * type: 'video' | 'image'
 *   video   → full-screen autoplay video (can mute/skip), dismiss = skip button
 *   image   → still poster with optional effect (fireworks / balloons),
 *             auto-dismisses after `durationSec` seconds (default 8s), or skip.
 *
 * effect: 'none' | 'fireworks' | 'balloons'  (only meaningful for image)
 *
 * Scheduling:
 *   startsAt, endsAt  — ISO date window. Only shown when "now" is inside
 *                       [startsAt, endsAt]. If startsAt is null, starts
 *                       immediately upon activation; if endsAt is null,
 *                       runs until manually deactivated.
 *   active            - master on/off switch (owner can disable without deleting).
 *
 * showOncePerUser:
 *   true  → after a visitor dismisses/sees the announcement, we write a key
 *           to localStorage (keyed by announcement _id) and never show it
 *           to that device again.
 *   false → shows on every page load during its window (until dismissed or
 *           expires). Use false for critical announcements; true for
 *           birthday/winner greetings.
 */
const AnnouncementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, default: '', trim: true, maxlength: 400 }, // optional sub-text
  type: { type: String, required: true, enum: ['image', 'video'], default: 'image' },
  effect: { type: String, enum: ['none', 'fireworks', 'balloons'], default: 'none' },
  mediaUrl: { type: String, required: true },
  publicId: { type: String, default: '' }, // Cloudinary public_id for cleanup on delete
  durationSec: { type: Number, default: 8, min: 3, max: 120 }, // for image auto-dismiss
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  active: { type: Boolean, default: true },
  showOncePerUser: { type: Boolean, default: true },
  // Stats
  views: { type: Number, default: 0 },
  skips: { type: Number, default: 0 },
  createdBy: { type: String, default: '' },  // email of creator
}, { timestamps: true })

// We only ever serve the active one whose window is "now".
// This index makes that query fast and ensures we never accidentally
// surface multiple announcements (we pick the most recently updated).
AnnouncementSchema.index({ active: 1, startsAt: 1, endsAt: 1 })

export default mongoose.models.Announcement || mongoose.model('Announcement', AnnouncementSchema)
