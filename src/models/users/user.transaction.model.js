import mongoose from "mongoose";

const userTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  transactions: [
    {
      community: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Community",
        required: true
      },
      trxnId: {
        type: String,
        required: true
      },
      orderAmount: Number,
      txnDate: Date,
      status: {
        type: String,
        enum: ['processing', 'completed', 'failed'],
        default: 'processing'
      }
    }
  ]
}, { timestamps: true });

// Configure the schema to populate community details automatically
userTransactionSchema.pre('find', function() {
  this.populate({
    path: 'transactions.community',
    select: '_id communityName communityProfileImage communityUsername' // Assuming these are the field names in your Community schema
  });
});

userTransactionSchema.pre('findOne', function() {
  this.populate({
    path: 'transactions.community',
    select: '_id communityName communityProfileImage communityUsername'
  });
});

const userTransaction = mongoose.model("userTransaction", userTransactionSchema);

export { userTransaction };