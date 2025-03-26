import mongoose from "mongoose";

const userFollowerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  followersCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Index to optimize queries for checking if a user is following another
userFollowerSchema.index({ user: 1, 'followers': 1 });

const UserFollower = mongoose.model("UserFollower", userFollowerSchema);

export default UserFollower;