import mongoose from "mongoose";

const userPaymentMethodSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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

const userPaymentMethod = mongoose.model("userPaymentMethod", userPaymentMethodSchema);

export  {userPaymentMethod};  