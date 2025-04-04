import mongoose from "mongoose";

const userFollowingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true
  },
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  followingCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

  userFollowingSchema.pre('save', function(next) {
  this.followingCount = this.following.length;
  next();
});

// Index to optimize queries for checking if a user is following another
userFollowingSchema.index({ user: 1, 'following': 1 });

const UserFollowing = mongoose.model("UserFollowing", userFollowingSchema);

export default UserFollowing;