import mongoose from 'mongoose'

const ArtistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  title: { type: String, default: '' },
  bio: { type: String, default: '' },
  image: { type: String, default: '' },
  videoUrl: { type: String, default: '' },
  isGroup: { type: Boolean, default: false },
  // If this artist is a member of a group, reference the group's _id
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', default: null },
  groupMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artist' }],
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true })

export default mongoose.models.Artist || mongoose.model('Artist', ArtistSchema)
