// import mongoose from "mongoose";

// const CommunityPaymentMethodSchema = new mongoose.Schema({
//   communityId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Community',
//     required: true,
//     index: true
//   },
//   type: {
//     type: String,
//     enum: ['card', 'bank', 'upi'],
//     required: true
//   },
//   isDefault: {
//     type: Boolean,
//     default: false
//   },
//   // For card payments
//   cardDetails: {
//     lastFourDigits: String,
//     cardType: String,
//     expiryMonth: String,
//     expiryYear: String,
//     cardHolderName: String
//   },
//   // For bank account
//   bankDetails: {
//     accountNumber: String,
//     bankName: String,
//     accountHolderName: String,
//     ifscCode: String
//   },
//   // For UPI
//   upiDetails: {
//     upiId: String,
//     upiHolderName: String
//   },
//   addedAt: {
//     type: Date,
//     default: Date.now
//   }
// }, { timestamps: true });

// const CommunityPaymentMethod = mongoose.model("CommunityPaymentMethod", CommunityPaymentMethodSchema);

// export default CommunityPaymentMethod;

import mongoose from "mongoose";
import { ApiError } from "../../utils/responseUtils.js";

const paymentMethodTypes = ["card", "bank", "upi"];

const CommunityPaymentMethodSchema = new mongoose.Schema(
  {
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: [true, "Community ID is required"],
      index: true,
    },
    type: {
      type: String,
      enum: paymentMethodTypes,
      required: [true, "Payment method type is required"],
      index: true, // Add index for faster querying by type
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true, // Add index for faster querying of default payment methods
    },
    // For card payments
    cardDetails: {
      lastFourDigits: {
        type: String,
        trim: true,
        maxlength: 4,
      },
      cardType: {
        type: String,
        trim: true,
      },
      expiryMonth: {
        type: String,
        trim: true,
        maxlength: 2,
      },
      expiryYear: {
        type: String,
        trim: true,
        maxlength: 4,
      },
      cardHolderName: {
        type: String,
        trim: true,
      },
    },
    // For bank account
    bankDetails: {
      accountNumber: {
        type: String,
        trim: true,
      },
      bankName: {
        type: String,
        trim: true,
      },
      accountHolderName: {
        type: String,
        trim: true,
      },
      ifscCode: {
        type: String,
        trim: true,
        uppercase: true,
      },
    },
    // For UPI
    upiDetails: {
      upiId: {
        type: String,
        trim: true,
      },
      upiHolderName: {
        type: String,
        trim: true,
      },
    },
    status: {
      type: String,
      enum: ["active", "expired", "disabled"],
      default: "active",
      index: true, // Index for efficient status filtering
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for fast querying of payment methods by community and status
CommunityPaymentMethodSchema.index({ communityId: 1, status: 1 });
// Compound index for finding default payment methods for a community
CommunityPaymentMethodSchema.index({ communityId: 1, isDefault: 1 });

// Create a text index for searching payment methods
CommunityPaymentMethodSchema.index({
  "cardDetails.cardHolderName": "text",
  "bankDetails.accountHolderName": "text",
  "upiDetails.upiHolderName": "text",
});

// Virtual for expiry date formatting
CommunityPaymentMethodSchema.virtual("formattedExpiryDate").get(function () {
  if (
    this.type !== "card" ||
    !this.cardDetails?.expiryMonth ||
    !this.cardDetails?.expiryYear
  ) {
    return null;
  }
  return `${this.cardDetails.expiryMonth}/${this.cardDetails.expiryYear}`;
});

// Virtual for masked account number
CommunityPaymentMethodSchema.virtual("maskedAccountNumber").get(function () {
  if (this.type !== "bank" || !this.bankDetails?.accountNumber) {
    return null;
  }
  const accountNumber = this.bankDetails.accountNumber;
  if (accountNumber.length <= 4) return accountNumber;
  return "XXXX" + accountNumber.slice(-4);
});

// Virtual to check if payment method is expired (for cards)
CommunityPaymentMethodSchema.virtual("isExpired").get(function () {
  if (
    this.type !== "card" ||
    !this.cardDetails?.expiryMonth ||
    !this.cardDetails?.expiryYear
  ) {
    return false;
  }

  const currentDate = new Date();
  const expiryMonth = parseInt(this.cardDetails.expiryMonth, 10);
  const expiryYear = parseInt(this.cardDetails.expiryYear, 10);

  if (expiryYear < currentDate.getFullYear()) {
    return true;
  }

  if (
    expiryYear === currentDate.getFullYear() &&
    expiryMonth < currentDate.getMonth() + 1
  ) {
    return true;
  }

  return false;
});

// Pre-save middleware to validate data based on payment method type
CommunityPaymentMethodSchema.pre("save", function (next) {
  // Validate card details
  if (this.type === "card") {
    if (
      !this.cardDetails ||
      !this.cardDetails.lastFourDigits ||
      !this.cardDetails.expiryMonth ||
      !this.cardDetails.expiryYear
    ) {
      return next(new ApiError(400, "Card details are incomplete"));
    }
  }

  // Validate bank details
  if (this.type === "bank") {
    if (
      !this.bankDetails ||
      !this.bankDetails.accountNumber ||
      !this.bankDetails.bankName ||
      !this.bankDetails.ifscCode
    ) {
      return next(new ApiError(400, "Bank details are incomplete"));
    }
  }

  // Validate UPI details
  if (this.type === "upi") {
    if (!this.upiDetails || !this.upiDetails.upiId) {
      return next(new ApiError(400, "UPI details are incomplete"));
    }
  }

  next();
});

// If a payment method is set as default, unset any other default for that community
CommunityPaymentMethodSchema.pre("save", async function (next) {
  if (this.isDefault && this.isModified("isDefault")) {
    await this.constructor.updateMany(
      {
        communityId: this.communityId,
        _id: { $ne: this._id },
        isDefault: true,
      },
      {
        $set: { isDefault: false },
      }
    );
  }
  next();
});

// Static method to find the default payment method for a community
CommunityPaymentMethodSchema.statics.findDefaultForCommunity = async function (
  communityId
) {
  return this.findOne({ communityId, isDefault: true, status: "active" });
};

// Static method to get all active payment methods for a community
CommunityPaymentMethodSchema.statics.getActiveMethods = async function (
  communityId
) {
  return this.find({ communityId, status: "active" }).sort({
    isDefault: -1,
    updatedAt: -1,
  });
};

// Static method to set a payment method as default
CommunityPaymentMethodSchema.statics.setAsDefault = async function (
  methodId,
  communityId
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // First, unset all existing defaults
    await this.updateMany(
      { communityId, isDefault: true },
      { $set: { isDefault: false } },
      { session }
    );

    // Then set the new default
    const updatedMethod = await this.findOneAndUpdate(
      { _id: methodId, communityId },
      { $set: { isDefault: true } },
      { new: true, session }
    );

    if (!updatedMethod) {
      throw new ApiError(404, "Payment method not found");
    }

    await session.commitTransaction();
    return updatedMethod;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Static method to check if a payment method needs updating (e.g., card expiring soon)
CommunityPaymentMethodSchema.statics.checkExpiringMethods = async function (
  communityId
) {
  const today = new Date();
  const threeMonthsLater = new Date(today);
  threeMonthsLater.setMonth(today.getMonth() + 3);

  const currentMonth = (today.getMonth() + 1).toString().padStart(2, "0");
  const currentYear = today.getFullYear().toString();
  const expiryMonth = (threeMonthsLater.getMonth() + 1)
    .toString()
    .padStart(2, "0");
  const expiryYear = threeMonthsLater.getFullYear().toString();

  return this.find({
    communityId,
    type: "card",
    status: "active",
    $or: [
      {
        "cardDetails.expiryYear": currentYear,
        "cardDetails.expiryMonth": { $lte: expiryMonth, $gte: currentMonth },
      },
      {
        "cardDetails.expiryYear": expiryYear,
        "cardDetails.expiryMonth": { $lte: expiryMonth },
      },
    ],
  });
};

const CommunityPaymentMethod = mongoose.model(
  "CommunityPaymentMethod",
  CommunityPaymentMethodSchema
);

export default CommunityPaymentMethod;
