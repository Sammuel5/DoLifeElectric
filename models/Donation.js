import mongoose from 'mongoose'

const DonationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userEmail: { type: String, required: true },
  userName: { type: String, default: '' },
  artistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', default: null },
  artistName: { type: String, default: '' },
  giftType: { type: String, required: true, enum: ['food', 'clothes', 'gift', 'money'] },
  amount: { type: Number, required: true }, // in centavos (PHP) — ₱100 = 10000
  currency: { type: String, default: 'php' },
  paymentMethod: { type: String, default: 'card' },
  message: { type: String, default: '' },
  provider: { type: String, default: 'paymongo' }, // payment provider name
  paymongoLinkId: { type: String, default: '' },       // PayMongo Link ID (link_xxx)
  paymongoPaymentId: { type: String, default: '' },    // PayMongo Payment ID (pay_xxx)
  paymongoReferenceNo: { type: String, default: '' },  // dle_<donationId> reference
  checkoutUrl: { type: String, default: '' },          // PayMongo hosted checkout URL
  // Legacy fields (kept for backward compat with any old test data):
  stripeSessionId: { type: String, default: '' },
  stripePaymentIntentId: { type: String, default: '' },
  status: { type: String, default: 'pending', enum: ['pending', 'completed', 'failed', 'refunded'] },
  metadata: { type: Object, default: {} },
  paidAt: { type: Date, default: null },
}, { timestamps: true })

// All money goes to DLE Entertainment's single company account via PayMongo.
// Separation to artists is handled manually by management.

export default mongoose.models.Donation || mongoose.model('Donation', DonationSchema)
