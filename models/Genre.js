import mongoose from 'mongoose'

const GenreSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, default: '' },
  description: { type: String, default: '' },
  color: { type: String, default: '' }, // optional hex accent
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true })

GenreSchema.index({ order: 1, name: 1 })
GenreSchema.index({ active: 1, order: 1, name: 1 })

export default mongoose.models.Genre || mongoose.model('Genre', GenreSchema)
