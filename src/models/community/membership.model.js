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
import { ApiError } from "../../utils/responseUtils.js";

// Constants for better maintainability
const MEMBERSHIP_ROLES = {
  MEMBER: "member",
  ADMIN: "admin",
};

const MEMBERSHIP_TYPES = {
  FREE: "free",
  PAID: "paid",
};

const MEMBERSHIP_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  BANNED: "banned",
  ANONYMOUS: "anonymous",
};

const SUBSCRIPTION_STATUS = {
  FREE: "free",
  PAID: "paid",
  EXPIRED: "expired",
};

// Utility functions for level calculations
const levelUtils = {
  calculateLevel: (points) => Math.floor(Math.sqrt(points) / 10) + 1,

  pointsForLevel: (level) => Math.pow((level - 1) * 10, 2),

  calculateProgress: function (points, currentLevel) {
    const pointsForCurrentLevel = this.pointsForLevel(currentLevel);
    const pointsForNextLevel = this.pointsForLevel(currentLevel + 1);
    const pointsNeeded = pointsForNextLevel - pointsForCurrentLevel;
    const pointsAchieved = points - pointsForCurrentLevel;

    return Math.min(100, Math.floor((pointsAchieved / pointsNeeded) * 100));
  },
};

// Shared transform function for both toJSON and toObject
const transformMembership = (doc, ret) => {
  ret.id = ret._id;
  delete ret._id;
  delete ret.__v;

  // Remove null fields
  Object.keys(ret).forEach((key) => {
    if (ret[key] === null || ret[key] === undefined) {
      delete ret[key];
    }
  });

  // If membership is free, remove subscription-related fields
  if (ret.membershipType === MEMBERSHIP_TYPES.FREE) {
    delete ret.subscriptionStatus;
    delete ret.subscription;
  }

  return ret;
};

const membershipSchema = new mongoose.Schema(
  {
    // The user who is a member
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // The community they belong to
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: Object.values(MEMBERSHIP_ROLES),
      default: MEMBERSHIP_ROLES.MEMBER,
      index: true,
    },

    // This field will be used to determine if this is a paid membership
    membershipType: {
      type: String,
      required: true,
      enum: Object.values(MEMBERSHIP_TYPES),
      default: MEMBERSHIP_TYPES.FREE,
    },

    status: {
      type: String,
      enum: Object.values(MEMBERSHIP_STATUS),
      default: MEMBERSHIP_STATUS.ACTIVE,
      index: true,
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
      lastActive: { type: Date, index: true }, // Added index for activity queries
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
    discriminatorKey: "membershipType",

    toJSON: {
      virtuals: true,
      transform: transformMembership,
    },
    toObject: {
      virtuals: true,
      transform: transformMembership,
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
  return this.status === MEMBERSHIP_STATUS.ACTIVE;
});

// Is the membership an admin role
membershipSchema.virtual("isAdmin").get(function () {
  return this.role === MEMBERSHIP_ROLES.ADMIN;
});

// Is the subscription active and not expired
membershipSchema.virtual("hasActiveSubscription").get(function () {
  // Only applicable for paid memberships
  if (this.membershipType !== MEMBERSHIP_TYPES.PAID) {
    return null; // Not applicable
  }

  if (this.subscriptionStatus !== SUBSCRIPTION_STATUS.PAID) {
    return false;
  }

  // If subscription data is present, check if not expired
  if (this.subscription?.endDate) {
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
  // Only applicable for paid memberships
  if (this.membershipType !== MEMBERSHIP_TYPES.PAID) {
    return null; // Not applicable
  }

  if (!this.subscription?.endDate) {
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
  try {
    if (!points || isNaN(points) || points <= 0) {
      return this;
    }

    this.level.points += points;

    // Calculate new level using utility function
    const newLevel = levelUtils.calculateLevel(this.level.points);

    if (newLevel > this.level.currentLevel) {
      // Level up!
      this.level.currentLevel = newLevel;
      this.level.progress = 0;
    } else {
      // Update progress to next level using utility function
      this.level.progress = levelUtils.calculateProgress(
        this.level.points,
        this.level.currentLevel
      );
    }

    // Update last activity timestamp
    this.activityStats.lastActive = new Date();

    return this.save();
  } catch (error) {
    throw new ApiError(500, `Error adding points: ${error.message}`);
  }
};

// Method to update subscription - base implementation
membershipSchema.methods.updateSubscription = async function (
  subscriptionData
) {
  if (this.membershipType !== MEMBERSHIP_TYPES.PAID) {
    throw new ApiError(
      400,
      "Cannot update subscription for free community membership"
    );
  }

  // For paid memberships, delegate to the appropriate implementation
  // This allows the method to be called on any membership type
  if (this instanceof PaidMembership) {
    return PaidMembership.prototype.updateSubscription.call(
      this,
      subscriptionData
    );
  }

  throw new ApiError(501, "Method not implemented for this membership type");
};

// Method to update role
membershipSchema.methods.updateRole = async function (newRole) {
  try {
    if (!Object.values(MEMBERSHIP_ROLES).includes(newRole)) {
      throw new ApiError(400, "Invalid role value");
    }

    this.role = newRole;
    return this.save();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, `Error updating role: ${error.message}`);
  }
};

// Method to check if user can perform admin actions
membershipSchema.methods.canPerformAdminActions = function () {
  return (
    this.status === MEMBERSHIP_STATUS.ACTIVE &&
    this.role === MEMBERSHIP_ROLES.ADMIN
  );
};

// STATICS

// Static method to create the appropriate membership type
membershipSchema.statics.createMembership = async (
  membershipData,
  community = null
) => {
  try {
    const Community = mongoose.model("Community");

    if (!community) {
      community = await Community.findById(membershipData.communityId).select(
        "communityType"
      );
      if (!community) {
        throw new ApiError(404, "Community not found");
      }
    }

    membershipData.membershipType = community.membershipType;

    if (community.membershipType === MEMBERSHIP_TYPES.PAID) {
      return new PaidMembership(membershipData).save();
    } else {
      return new Membership(membershipData).save();
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, `Error creating membership: ${error.message}`);
  }
};

// Find active members of a community
membershipSchema.statics.findActiveMembersByCommunity = async function (
  communityId,
  options = {}
) {
  try {
    const query = {
      communityId,
      status: options.status || MEMBERSHIP_STATUS.ACTIVE,
    };

    // Add role filter if provided
    if (options.role) {
      query.role = options.role;
    }

    // Create base query
    let memberQuery = this.find(query);

    // Apply population if requested
    if (options.populate) {
      if (options.populate.includes("user")) {
        memberQuery = memberQuery.populate("userData");
      }
      if (options.populate.includes("community")) {
        memberQuery = memberQuery.populate("communityData");
      }
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

    // Use lean for read-only operations
    if (options.lean !== false) {
      memberQuery = memberQuery.lean();
    }

    return memberQuery.exec();
  } catch (error) {
    throw new ApiError(500, `Error finding members: ${error.message}`);
  }
};

// Get community leaderboard (by points)
membershipSchema.statics.getCommunityLeaderboard = async function (
  communityId,
  limit = 10,
  options = {}
) {
  try {
    const query = {
      communityId,
      status: options.status || MEMBERSHIP_STATUS.ACTIVE,
    };

    let leaderboardQuery = this.find(query)
      .sort({ "level.points": -1 })
      .limit(limit);

    // Apply population if requested
    if (options.populate) {
      if (options.populate.includes("user")) {
        leaderboardQuery = leaderboardQuery.populate("userData");
      }
    }

    // Use lean for read-only operations
    if (options.lean !== false) {
      leaderboardQuery = leaderboardQuery.lean();
    }

    return leaderboardQuery.exec();
  } catch (error) {
    throw new ApiError(500, `Error getting leaderboard: ${error.message}`);
  }
};

// Get a user's communities
membershipSchema.statics.getUserCommunities = async function (
  userId,
  options = {}
) {
  try {
    const query = {
      userId,
      status: options.status || MEMBERSHIP_STATUS.ACTIVE,
    };

    if (options.role) {
      query.role = options.role;
    }

    let communitiesQuery = this.find(query);

    // Apply population if requested
    if (options.populate) {
      if (options.populate.includes("community")) {
        communitiesQuery = communitiesQuery.populate("communityData");
      }
    }

    // Apply sorting
    communitiesQuery = communitiesQuery.sort(options.sort || { joinedAt: -1 });

    // Use lean for read-only operations
    if (options.lean !== false) {
      communitiesQuery = communitiesQuery.lean();
    }

    return communitiesQuery.exec();
  } catch (error) {
    throw new ApiError(500, `Error getting user communities: ${error.message}`);
  }
};

// Find membership by user and community
membershipSchema.statics.findMembership = async function (
  userId,
  communityId,
  options = {}
) {
  try {
    if (!userId || !communityId) {
      throw new ApiError(400, "Both userId and communityId are required");
    }

    let query = this.findOne({ userId, communityId });

    // Apply population if requested
    if (options.populate) {
      if (options.populate.includes("user")) {
        query = query.populate("userData");
      }
      if (options.populate.includes("community")) {
        query = query.populate("communityData");
      }
    }

    // Use lean for read-only operations
    if (options.lean !== false) {
      query = query.lean();
    }

    return query.exec();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, `Error finding membership: ${error.message}`);
  }
};

// Check if user is a member of community
membershipSchema.statics.isUserMember = async (userId, communityId) => {
  try {
    if (!userId || !communityId) {
      throw new ApiError(400, "Both userId and communityId are required");
    }

    // Use the base Membership model for queries
    const membership = await mongoose
      .model("Membership")
      .findOne({
        userId,
        communityId,
        status: MEMBERSHIP_STATUS.ACTIVE,
      })
      .lean();

    return !!membership;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, `Error checking membership: ${error.message}`);
  }
};

// Check if user is an admin of community
membershipSchema.statics.isUserAdmin = async function (userId, communityId) {
  try {
    if (!userId || !communityId) {
      throw new ApiError(400, "Both userId and communityId are required");
    }

    const membership = await this.findOne({
      userId,
      communityId,
      status: MEMBERSHIP_STATUS.ACTIVE,
      role: MEMBERSHIP_ROLES.ADMIN,
    }).lean();

    return !!membership;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, `Error checking admin status: ${error.message}`);
  }
};

// Count members by community and status
membershipSchema.statics.countMembers = async function (
  communityId,
  status = MEMBERSHIP_STATUS.ACTIVE
) {
  try {
    if (!communityId) {
      throw new ApiError(400, "communityId is required");
    }

    return this.countDocuments({
      communityId,
      status,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, `Error counting members: ${error.message}`);
  }
};

membershipSchema.methods.isPaidMembership = function () {
  return this.membershipType === MEMBERSHIP_TYPES.PAID;
};

// Base schema should have a stub method for compatibility
membershipSchema.methods.getSubscriptionDetails = () => {
  return null; // Not applicable for free memberships
};

// MIDDLEWARES
membershipSchema.pre("save", async function (next) {
  // Store original values first
  if (this.isModified("status")) {
    this._previousStatus = this._previousStatus || this.status;
  }

  // Only store subscription status for paid memberships
  if (
    this.membershipType === MEMBERSHIP_TYPES.PAID &&
    this.isModified("subscriptionStatus")
  ) {
    this._previousSubscriptionStatus =
      this._previousSubscriptionStatus || this.subscriptionStatus;
  }

  // Handle status changes
  if (
    this.isModified("status") &&
    this._previousStatus === MEMBERSHIP_STATUS.ACTIVE &&
    [MEMBERSHIP_STATUS.INACTIVE, MEMBERSHIP_STATUS.BANNED].includes(this.status)
  ) {
    // We could perform cleanup actions here
    // e.g., mark user's posts as hidden, etc.
  }

  // Only check subscription status changes for paid memberships
  if (this.membershipType === MEMBERSHIP_TYPES.PAID) {
    // If subscription status is changing to expired
    if (
      this.isModified("subscriptionStatus") &&
      this.subscriptionStatus === SUBSCRIPTION_STATUS.EXPIRED &&
      this._previousSubscriptionStatus === SUBSCRIPTION_STATUS.PAID
    ) {
      // We could handle subscription expiry consequences here
    }
  }

  next();
});

const Membership = mongoose.model("Membership", membershipSchema);

// Create the paid membership discriminator model WITH subscription fields
const paidMembershipSchema = new mongoose.Schema({
  subscriptionStatus: {
    type: String,
    enum: Object.values(SUBSCRIPTION_STATUS),
    default: SUBSCRIPTION_STATUS.FREE,
    index: true,
  },

  // Subscription details (only for paid memberships)
  subscription: {
    startDate: { type: Date },
    endDate: { type: Date },
    plan: { type: String },
    amount: {
      type: Number,
      min: [0, "Amount cannot be negative"],
    },
    currency: { type: String, default: "INR" },
    paymentMethod: { type: String },
    autoRenew: { type: Boolean, default: false },
  },
});

// Implement the updateSubscription method for paid memberships
paidMembershipSchema.methods.updateSubscription = async function (
  subscriptionData
) {
  try {
    this.subscriptionStatus =
      subscriptionData.status || SUBSCRIPTION_STATUS.PAID;

    if (subscriptionData) {
      this.subscription = {
        ...this.subscription,
        ...subscriptionData,
        startDate: subscriptionData.startDate || new Date(),
      };
    }

    return this.save();
  } catch (error) {
    throw new ApiError(500, `Error updating subscription: ${error.message}`);
  }
};

// Implement the getSubscriptionDetails method for paid memberships
paidMembershipSchema.methods.getSubscriptionDetails = function () {
  return {
    status: this.subscriptionStatus,
    startDate: this.subscription?.startDate,
    endDate: this.subscription?.endDate,
    plan: this.subscription?.plan,
    amount: this.subscription?.amount,
    currency: this.subscription?.currency,
    paymentMethod: this.subscription?.paymentMethod,
    autoRenew: this.subscription?.autoRenew,
    isActive: this.hasActiveSubscription,
    timeRemaining: this.subscriptionTimeRemaining,
  };
};

// Create the paid membership model as a discriminator of Membership
const PaidMembership = Membership.discriminator(
  MEMBERSHIP_TYPES.PAID,
  paidMembershipSchema
);

// Export all models
// export { Membership, PaidMembership };
export default Membership;
