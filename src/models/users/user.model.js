import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long']
    },
    livelink:{
      type: String
    },
    state: {
      type: String,
      trim: true
    },
    bio: {
      type: String,
      trim: true
    },
    profilePhoto: String,
    coverPhoto: String,
    prferences: {
      type: String,
      trim: true,
      lowercase: true
    },
    verifiedNumber: {
      type: Number
    },
    contribution: {
      posts: {
        type: Number,
        default: 0
      },
      comments: {
        type: Number,
        default: 0
      },
      likes: {
        type: Number,
        default: 0
      },
      shares: {
        type: Number,
        default: 0
      },
      total: {
        type: Number,
        default: 0
      }
    },
    settings: {
      permissions: { type: mongoose.Schema.Types.ObjectId, ref: "userPermissions" }
    },

    socialAccounts: {
      instagram: String,
      facebook: String,
      x: String,
    },
    recentActivity:[
      { type: mongoose.Schema.Types.ObjectId, ref: "post" }
    ],

    // Payment methods for future payments
    paymentMethod: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "userPaymentMethod"
    }],

    followers:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserFollower"
    },
    followings:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserFollowing"
    },


    createdAt: { type: Date, default: Date.now },

  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
