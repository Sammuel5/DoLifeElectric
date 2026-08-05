import mongoose from 'mongoose'

const MusicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', default: null },
  artistName: { type: String, default: 'DLE Entertainment' },
  audioUrl: { type: String, required: true },
  coverImage: { type: String, default: '' },
  album: { type: String, default: '' },
  duration: { type: Number, default: 0 },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true })

export default mongoose.models.Music || mongoose.model('Music', MusicSchema)
