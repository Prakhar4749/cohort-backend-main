import mongoose from "mongoose";

const CommunityPaymentMethodSchema = new mongoose.Schema({
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['card', 'bank', 'upi'],
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  // For card payments
  cardDetails: {
    lastFourDigits: String,
    cardType: String,
    expiryMonth: String,
    expiryYear: String,
    cardHolderName: String
  },
  // For bank account
  bankDetails: {
    accountNumber: String,
    bankName: String,
    accountHolderName: String,
    ifscCode: String
  },
  // For UPI
  upiDetails: {
    upiId: String,
    upiHolderName: String
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const CommunityPaymentMethod = mongoose.model("CommunityPaymentMethod", CommunityPaymentMethodSchema);

export default CommunityPaymentMethod;