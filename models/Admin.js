import mongoose from 'mongoose'

// role: 'super' = owner (full access)
//       'admin' = granted admin (permissions controlled by flags below)
//
// permissions flags (only meaningfully checked for role='admin'; super always has everything):
//   music          - can upload/edit/delete music tracks
//   artists        - can add/edit/delete artists & groups (default true for all admins)
//   donations      - can VIEW gifts tab and download/export donation data
//                    (editing status/deleting gifts ALWAYS stays owner-only)
//   analytics      - can VIEW Plays & Downloads tab and export listener analytics
//                    (deleting activity records ALWAYS stays owner-only)
//   announcements  - can create/edit/delete site-wide pop-up announcements (video/image greetings)
const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, default: '' },
  role: { type: String, required: true, enum: ['super', 'admin'], default: 'admin' },
  addedBy: { type: String, default: '' },
  permissions: {
    music:         { type: Boolean, default: false },
    artists:       { type: Boolean, default: true },
    donations:     { type: Boolean, default: false },
    analytics:     { type: Boolean, default: false },
    announcements: { type: Boolean, default: false },
  },
}, { timestamps: true })

AdminSchema.methods.can = function (perm) {
  if (this.role === 'super') return true
  const known = ['artists', 'music', 'donations', 'analytics', 'announcements']
  if (known.includes(perm)) return !!this.permissions?.[perm]
  return false
}

export default mongoose.models.Admin || mongoose.model('Admin', AdminSchema)
