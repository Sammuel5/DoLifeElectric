import mongoose from 'mongoose'

const TrackActivitySchema = new mongoose.Schema({
  trackId: { type: mongoose.Schema.Types.ObjectId, ref: 'Music', default: null },
  trackTitle: { type: String, default: '' },
  artistName: { type: String, default: '' },
  activityType: { type: String, enum: ['play', 'download'], required: true },
  userEmail: { type: String, required: true },
  userName: { type: String, default: '' },
}, { timestamps: true })

// Index for fast lookups
TrackActivitySchema.index({ createdAt: -1 })
TrackActivitySchema.index({ userEmail: 1 })
TrackActivitySchema.index({ activityType: 1 })
TrackActivitySchema.index({ trackId: 1 })

export default mongoose.models.TrackActivity || mongoose.model('TrackActivity', TrackActivitySchema)
