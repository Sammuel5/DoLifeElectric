import mongoose from 'mongoose'

const BoardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  position: { type: String, required: true },
  image: { type: String, default: '' },
  order: { type: Number, default: 0 },
}, { timestamps: true })

export default mongoose.models.Board || mongoose.model('Board', BoardSchema)
