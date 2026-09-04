import mongoose from 'mongoose'

const MusicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', default: null },
  artistName: { type: String, default: 'DLE Entertainment' },
  genreId: { type: mongoose.Schema.Types.ObjectId, ref: 'Genre', default: null },
  genreName: { type: String, default: '' },
  audioUrl: { type: String, required: true },
  audioPublicId: { type: String, default: '' }, // Cloudinary public_id (for cleanup)
  audioStorage: { type: String, default: '' },  // 'cloudinary' | 'local'
  coverImage: { type: String, default: '' },
  coverPublicId: { type: String, default: '' },
  coverStorage: { type: String, default: '' },
  album: { type: String, default: '' },
  duration: { type: Number, default: 0 },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true })

MusicSchema.index({ active: 1, order: 1, createdAt: -1 })
MusicSchema.index({ genreId: 1 })

export default mongoose.models.Music || mongoose.model('Music', MusicSchema)
