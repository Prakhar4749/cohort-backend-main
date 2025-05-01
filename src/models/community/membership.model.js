// import mongoose from 'mongoose';

// const membershipSchema = new mongoose.Schema({
//     // The user who is a member
//     userId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User',
//         required: true
//     },

//     // The community they belong to
//     communityId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Community',
//         required: true
//     },

//     role: {
//         type: String,
//         enum: ['member', 'admin'],
//         default: 'member'
//     },
//     status: {
//         type: String,
//         enum: ['active', 'inactive', 'banned'],
//         default: 'active'
//     },
//     subscriptionStatus: {
//         type: String,
//         enum: ['free', 'paid', 'expired'],
//         default: 'free'
//     },

//     // Gamification data
//     level: {
//         currentLevel: { type: Number, default: 1 },
//         points: { type: Number, default: 0 },
//         progress: { type: Number, default: 0 }
//     },

//     joinedAt: {
//         type: Date,
//         default: Date.now
//     }
// }, { timestamps: true });

// // Ensure a user can only be a member of a community once
// membershipSchema.index({ userId: 1, communityId: 1 }, { unique: true });

// export const Membership = mongoose.model('Membership', membershipSchema);

import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema(
  {
    // The user who is a member
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Add index for better query performance
    },

    // The community they belong to
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      index: true, // Add index for better query performance
    },

    role: {
      type: String,
      enum: ["member", "admin"],
      default: "member",
      index: true, // Add index for role-based queries
    },

    status: {
      type: String,
      enum: ["active", "inactive", "banned", "anonymous"],
      default: "active",
      index: true, // Add index for status-based filtering
    },

    subscriptionStatus: {
      type: String,
      enum: ["free", "paid", "expired"],
      default: "free",
      index: true, // Add index for subscription-based queries
    },

    // Subscription details (for paid memberships)
    subscription: {
      startDate: { type: Date },
      endDate: { type: Date },
      plan: { type: String },
      amount: { type: Number },
      currency: { type: String, default: "INR" },
      paymentMethod: { type: String },
      autoRenew: { type: Boolean, default: false },
    },

    // Gamification data
    level: {
      currentLevel: { type: Number, default: 1 },
      points: { type: Number, default: 0 },
      progress: { type: Number, default: 0 },
    },

    // Metrics
    activityStats: {
      postCount: { type: Number, default: 0 },
      commentCount: { type: Number, default: 0 },
      likeCount: { type: Number, default: 0 },
      lastActive: { type: Date },
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },

    // Optional invite data
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    // Configure toJSON and toObject options
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// Ensure a user can only be a member of a community once
membershipSchema.index({ userId: 1, communityId: 1 }, { unique: true });

// Add more useful compound indexes for common queries
membershipSchema.index({ communityId: 1, role: 1, status: 1 }); // For finding active admins of a community
membershipSchema.index({ communityId: 1, status: 1 }); // For counting active members
membershipSchema.index({ userId: 1, status: 1 }); // For finding a user's active memberships
membershipSchema.index({ "level.points": -1, communityId: 1 }); // For leaderboards

// VIRTUALS

// Is the membership active
membershipSchema.virtual("isActive").get(function () {
  return this.status === "active";
});

// Is the membership an admin role
membershipSchema.virtual("isAdmin").get(function () {
  return this.role === "admin";
});

// Is the subscription active and not expired
membershipSchema.virtual("hasActiveSubscription").get(function () {
  if (this.subscriptionStatus !== "paid") {
    return false;
  }

  // If subscription data is present, check if not expired
  if (this.subscription && this.subscription.endDate) {
    return new Date(this.subscription.endDate) > new Date();
  }

  return true; // Paid with no end date
});

// Membership duration in days
membershipSchema.virtual("membershipDuration").get(function () {
  const now = new Date();
  const joined = new Date(this.joinedAt);
  return Math.floor((now - joined) / (1000 * 60 * 60 * 24)); // Convert ms to days
});

// Time remaining in subscription (days)
membershipSchema.virtual("subscriptionTimeRemaining").get(function () {
  if (!this.subscription || !this.subscription.endDate) {
    return null;
  }

  const now = new Date();
  const endDate = new Date(this.subscription.endDate);

  if (endDate <= now) {
    return 0;
  }

  return Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)); // Days remaining (rounded up)
});

// Progress to next level as percentage
membershipSchema.virtual("nextLevelProgress").get(function () {
  return Math.min(100, this.level.progress);
});

// Virtual for user data - allows populating user info without separate query
membershipSchema.virtual("userData", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
  options: { select: "name username profileImage email" }, // Limit fields
});

// Virtual for community data - allows populating community info without separate query
membershipSchema.virtual("communityData", {
  ref: "Community",
  localField: "communityId",
  foreignField: "_id",
  justOne: true,
  options: { select: "communityName communityUsername communityType" }, // Limit fields
});

// METHODS

// Instance method to add points and handle level progression
membershipSchema.methods.addPoints = async function (points) {
  if (!points || isNaN(points) || points <= 0) {
    return this;
  }

  this.level.points += points;

  // Calculate new level - simple algorithm (can be replaced with more complex one)
  const newLevel = Math.floor(Math.sqrt(this.level.points) / 10) + 1;

  if (newLevel > this.level.currentLevel) {
    // Level up!
    this.level.currentLevel = newLevel;
    this.level.progress = 0;
  } else {
    // Update progress to next level
    const pointsForCurrentLevel = Math.pow(
      (this.level.currentLevel - 1) * 10,
      2
    );
    const pointsForNextLevel = Math.pow(this.level.currentLevel * 10, 2);
    const pointsNeeded = pointsForNextLevel - pointsForCurrentLevel;
    const pointsAchieved = this.level.points - pointsForCurrentLevel;

    this.level.progress = Math.min(
      100,
      Math.floor((pointsAchieved / pointsNeeded) * 100)
    );
  }

  // Update last activity timestamp
  this.activityStats.lastActive = new Date();

  await this.save();
  return this;
};

// Method to update status
membershipSchema.methods.updateStatus = async function (newStatus) {
  if (!["active", "inactive", "banned"].includes(newStatus)) {
    throw new Error("Invalid status value");
  }

  this.status = newStatus;
  await this.save();
  return this;
};

// Method to update role
membershipSchema.methods.updateRole = async function (newRole) {
  if (!["member", "admin"].includes(newRole)) {
    throw new Error("Invalid role value");
  }

  this.role = newRole;
  await this.save();
  return this;
};

// Method to check if user can perform admin actions
membershipSchema.methods.canPerformAdminActions = function () {
  return this.status === "active" && this.role === "admin";
};

// Method to update subscription details
membershipSchema.methods.updateSubscription = async function (
  subscriptionData
) {
  this.subscriptionStatus = subscriptionData.status || "paid";

  if (subscriptionData) {
    this.subscription = {
      ...this.subscription,
      ...subscriptionData,
      startDate: subscriptionData.startDate || new Date(),
    };
  }

  await this.save();
  return this;
};

// STATICS

// Find active members of a community
membershipSchema.statics.findActiveMembersByCommunity = async function (
  communityId,
  options = {}
) {
  const query = {
    communityId,
    status: "active",
  };

  // Add role filter if provided
  if (options.role) {
    query.role = options.role;
  }

  // Create base query
  let memberQuery = this.find(query);

  // Apply population if requested
  if (options.populate && options.populate.includes("user")) {
    memberQuery = memberQuery.populate("userData");
  }

  // Apply sorting
  if (options.sort) {
    memberQuery = memberQuery.sort(options.sort);
  } else {
    // Default sort by join date
    memberQuery = memberQuery.sort({ joinedAt: -1 });
  }

  // Apply pagination
  if (options.limit) {
    memberQuery = memberQuery.limit(options.limit);

    if (options.page && options.page > 1) {
      const skip = (options.page - 1) * options.limit;
      memberQuery = memberQuery.skip(skip);
    }
  }

  return memberQuery.exec();
};

// Get community leaderboard (by points)
membershipSchema.statics.getCommunityLeaderboard = async function (
  communityId,
  limit = 10
) {
  return this.find({
    communityId,
    status: "active",
  })
    .sort({ "level.points": -1 })
    .limit(limit)
    .populate("userData")
    .exec();
};

// Get a user's communities
membershipSchema.statics.getUserCommunities = async function (
  userId,
  options = {}
) {
  const query = {
    userId,
    status: options.status || "active",
  };

  if (options.role) {
    query.role = options.role;
  }

  return this.find(query)
    .populate("communityData")
    .sort(options.sort || { joinedAt: -1 })
    .exec();
};

// Find membership by user and community
membershipSchema.statics.findMembership = async function (userId, communityId) {
  return this.findOne({ userId, communityId }).exec();
};

// Check if user is a member of community
membershipSchema.statics.isUserMember = async function (userId, communityId) {
  const membership = await this.findOne({
    userId,
    communityId,
    status: "active",
  });

  return !!membership;
};

// Check if user is an admin of community
membershipSchema.statics.isUserAdmin = async function (userId, communityId) {
  const membership = await this.findOne({
    userId,
    communityId,
    status: "active",
    role: "admin",
  });

  return !!membership;
};

// Count members by community and status
membershipSchema.statics.countMembers = async function (
  communityId,
  status = "active"
) {
  return this.countDocuments({
    communityId,
    status,
  });
};

// Middleware to update related models when status changes
membershipSchema.pre("save", async function (next) {
  // If status is changing to inactive or banned
  if (
    this.isModified("status") &&
    this._previousStatus === "active" &&
    ["inactive", "banned"].includes(this.status)
  ) {
    // We could perform cleanup actions here
    // e.g., mark user's posts as hidden, etc.
  }

  // If subscription status is changing to expired
  if (
    this.isModified("subscriptionStatus") &&
    this.subscriptionStatus === "expired" &&
    this._previousSubscriptionStatus === "paid"
  ) {
    // We could handle subscription expiry consequences here
  }

  next();
});

// Store original values before changes
membershipSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this._previousStatus = this.status;
  }

  if (this.isModified("subscriptionStatus")) {
    this._previousSubscriptionStatus = this.subscriptionStatus;
  }

  next();
});

const Membership = mongoose.model("Membership", membershipSchema);

export default Membership;
