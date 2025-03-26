import mongoose from "mongoose";


const communityTransactionSchema = new mongoose.Schema({
    community: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Community",
        required: true,
        unique: true
    },
    transactions: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true
              },
              trxnId:{
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
communityTransactionSchema.pre('find', function() {
    this.populate({
      path: 'transactions.user',
      select: '_id firstName lastName username profilePhoto ' // Assuming these are the field names in your Community schema
    });
  });
  
  communityTransactionSchema.pre('findOne', function() {
    this.populate({
      path: 'transactions.user',
      select: '_id firstName lastName username profilePhoto '
    });
  });

const communityTransaction = mongoose.model("communityTransaction", communityTransactionSchema);

export { communityTransaction }
