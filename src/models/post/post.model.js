// import mongoose from "mongoose";

// const PostSchema = new mongoose.Schema(
//   {
//     content: {
//       type: String,
//       required: true,
//       validate: {
//         validator: (v) => typeof v === "string" && v.trim().length > 15,
//         message: "Content should be more than 15 characters long.",
//       },
//     },
//     images: {
//       type: [String],
//       default: [], // Ensure `images` is always an array
//       validate: {
//         validator: function (images) {
//           return images.length <= 3;
//         },
//         message: "You can upload a maximum of 3 images.",
//       },
//     },
//     pinnedBy: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User",
//         index: true,
//       },
//     ],
//     isEdited: { type: Boolean, default: false, index: true },
//     likeCount: { type: Number, default: 0 },
//     commentCount: { type: Number, default: 0 },
//     shareCount: { type: Number, default: 0 },
//     viewsCount: { type: Number, default: 0 },
//     community: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Community",
//       required: true,
//       index: true,
//     },
//     postType: {
//       type: String,
//       enum: ["text", "poll"],
//       default: "text",
//       index: true,
//     },
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       index: true,
//     },
//     editedAt: { type: Date, default: null },
//   },
//   {
//     timestamps: true,
//   }
// );

// PostSchema.index({ content: "text" });

// PostSchema.pre("save", function (next) {
//   if (this.isModified("content") || this.isModified("images")) {
//     this.isEdited = true;
//     this.editedAt = new Date();
//   }
//   this.pinnedBy = [...new Set(this.pinnedBy.map((id) => id.toString()))];
//   next();
// });

// PostSchema.virtual("engagementScore").get(function () {
//   return this.likeCount + this.commentCount + this.viewsCount + this.shareCount;
// });

// const Post = mongoose.model("Post", PostSchema);
// export default Post;
// models/Post.js

import mongoose from "mongoose";
import { ApiError } from "../../utils/responseUtils.js";

// Constants for better maintainability
const POST_TYPES = {
  TEXT: "text",
  POLL: "poll",
  EVENT: "event",
  MEDIA: "media",
};

const POST_VISIBILITY = {
  PUBLIC: "public",
  PRIVATE: "private",
  COMMUNITY: "community",
  ANONYMOUS: "anonymous",
};

const POST_STATUS = {
  ACTIVE: "active",
  DELETED: "deleted",
  HIDDEN: "hidden",
  FLAGGED: "flagged",
};

const basePostSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      index: true,
    },
    contentText: {
      text: {
        type: String,
        maxlength: [10000, "Text content cannot exceed 10000 characters"],
      },
      image: { type: String },
      video: { type: String },
      link: { type: String },
    },
    postType: {
      type: String,
      required: true,
      enum: Object.values(POST_TYPES),
      default: POST_TYPES.TEXT,
      index: true,
    },
    visibility: {
      type: String,
      enum: Object.values(POST_VISIBILITY),
      default: POST_VISIBILITY.PUBLIC,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(POST_STATUS),
      default: POST_STATUS.ACTIVE,
      index: true,
    },
    tags: {
      type: [String],
      index: true,
      validate: [
        {
          validator: (tags) => tags.length <= 10,
          message: "Cannot have more than 10 tags per post",
        },
        {
          validator: (tags) => tags.every((tag) => tag.length <= 30),
          message: "Tags cannot exceed 30 characters",
        },
      ],
    },
    reactions: {
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
    },
    metadata: {
      device: String,
      location: String,
      userAgent: String,
    },
  },
  {
    timestamps: true,
    discriminatorKey: "postType",
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;

        Object.keys(ret).forEach((key) => {
          if (ret[key] === null || ret[key] === undefined) delete ret[key];
        });

        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Compound index for better performance on common queries
basePostSchema.index({ communityId: 1, status: 1, createdAt: -1 });
basePostSchema.index({ createdAt: -1 });

// VIRTUALS
basePostSchema.virtual("userData", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
  options: { select: "name username profileImage" },
});

basePostSchema.virtual("communityData", {
  ref: "Community",
  localField: "communityId",
  foreignField: "_id",
  justOne: true,
  options: { select: "communityName communityUsername" },
});

// METHODS
basePostSchema.methods.softDelete = async function () {
  this.status = POST_STATUS.DELETED;
  return this.save();
};

basePostSchema.methods.isOwnedBy = function (userId) {
  return this.userId.equals(userId);
};

basePostSchema.methods.incrementReaction = async function (type) {
  const validReactions = ["likes", "comments", "shares"];

  if (!validReactions.includes(type)) {
    throw new ApiError(400, `Invalid reaction type: ${type}`);
  }

  if (this.reactions[type] !== undefined) {
    this.reactions[type]++;
    return this.save();
  }

  throw new ApiError(400, `Reaction type not found: ${type}`);
};

// STATICS
basePostSchema.statics.createPost = async (data) => {
  try {
    // Validate post type against available discriminators
    const validPostTypes = [
      POST_TYPES.TEXT,
      POST_TYPES.POLL,
      POST_TYPES.EVENT,
      POST_TYPES.MEDIA,
    ];

    if (!validPostTypes.includes(data.postType)) {
      throw new ApiError(400, `Invalid postType: ${data.postType}`);
    }

    // Use the appropriate model based on post type
    let model;
    switch (data.postType) {
      case POST_TYPES.TEXT:
        model = Post; // Base model for text posts
        break;
      case POST_TYPES.POLL:
        model = PollPost;
        break;
      case POST_TYPES.MEDIA:
        model = MediaPost;
        break;
      case POST_TYPES.EVENT:
        model = EventPost;
        break;
      default:
        throw new ApiError(400, "Invalid postType");
    }

    return new model(data).save();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, `Error creating post: ${error.message}`);
  }
};

basePostSchema.statics.getCommunityPosts = async function (
  communityId,
  options = {}
) {
  try {
    const query = {
      communityId,
      status: options.status || POST_STATUS.ACTIVE,
    };

    if (options.visibility) {
      query.visibility = options.visibility;
    }

    if (options.postType) {
      query.postType = options.postType;
    }

    // Create base query
    let postsQuery = this.find(query);

    // Only populate if requested
    if (options.populate) {
      if (options.populate.includes("user")) {
        postsQuery = postsQuery.populate("userData");
      }
      if (options.populate.includes("community")) {
        postsQuery = postsQuery.populate("communityData");
      }
    }

    // Apply sorting
    postsQuery = postsQuery.sort(options.sort || { createdAt: -1 });

    // Apply pagination
    if (options.limit) {
      postsQuery = postsQuery.limit(options.limit);
      if (options.page && options.page > 1) {
        postsQuery = postsQuery.skip((options.page - 1) * options.limit);
      }
    }

    // Use lean for read-only operations
    if (options.lean !== false) {
      postsQuery = postsQuery.lean();
    }

    return postsQuery.exec();
  } catch (error) {
    throw new ApiError(500, `Error fetching community posts: ${error.message}`);
  }
};

basePostSchema.statics.getUserPosts = async function (userId, options = {}) {
  try {
    const query = {
      userId,
      status: options.status || POST_STATUS.ACTIVE,
    };

    let postsQuery = this.find(query).sort(options.sort || { createdAt: -1 });

    // Only populate if requested
    if (options.populate) {
      if (options.populate.includes("community")) {
        postsQuery = postsQuery.populate("communityData");
      }
    }

    // Apply limit
    if (options.limit) {
      postsQuery = postsQuery.limit(options.limit);
    }

    // Use lean for read-only operations
    if (options.lean !== false) {
      postsQuery = postsQuery.lean();
    }

    return postsQuery.exec();
  } catch (error) {
    throw new ApiError(500, `Error fetching user posts: ${error.message}`);
  }
};

basePostSchema.statics.findByTag = async function (
  tag,
  limit = 20,
  options = {}
) {
  try {
    if (!tag || typeof tag !== "string") {
      throw new ApiError(400, "Invalid tag parameter");
    }

    const query = {
      tags: tag,
      status: options.status || POST_STATUS.ACTIVE,
    };

    let postsQuery = this.find(query).sort({ createdAt: -1 }).limit(limit);

    // Only populate if requested
    if (options.populate) {
      if (options.populate.includes("user")) {
        postsQuery = postsQuery.populate("userData");
      }
      if (options.populate.includes("community")) {
        postsQuery = postsQuery.populate("communityData");
      }
    }

    // Use lean for read-only operations
    if (options.lean !== false) {
      postsQuery = postsQuery.lean();
    }

    return postsQuery.exec();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, `Error finding posts by tag: ${error.message}`);
  }
};

// BASE MODEL
const Post = mongoose.model("Post", basePostSchema);

// DISCRIMINATORS
const pollPostSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    maxlength: [500, "Poll question cannot exceed 500 characters"],
  },
  options: {
    type: [String],
    validate: [
      {
        validator: (options) => options.length >= 2 && options.length <= 10,
        message: "Poll must have between 2 and 10 options",
      },
      {
        validator: (options) => options.every((option) => option.length <= 100),
        message: "Poll options cannot exceed 100 characters",
      },
    ],
  },
  votes: {
    type: Map,
    of: Number,
    default: {},
  },
  votedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  expiresAt: { type: Date, required: true },
});

// Add method to check if poll is expired
pollPostSchema.methods.isExpired = function () {
  return new Date() > this.expiredAt;
};

// Add method to register a vote
pollPostSchema.methods.registerVote = async function (userId, optionIndex) {
  try {
    if (this.isExpired()) {
      throw new ApiError(400, "Poll has expired");
    }

    // Check if user already voted
    if (this.votedBy.some((id) => id.equals(userId))) {
      throw new ApiError(400, "User has already voted");
    }

    // Check if option exists
    if (optionIndex < 0 || optionIndex >= this.options.length) {
      throw new ApiError(400, "Invalid option index");
    }

    const option = this.options[optionIndex];

    // Initialize vote count if needed
    if (!this.votes.has(option)) {
      this.votes.set(option, 0);
    }

    await this.updateOne({
      $inc: { [`votes.${option}`]: 1 },
      $addToSet: { votedBy: userId },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, `Error registering vote: ${error.message}`);
  }
};

const PollPost = Post.discriminator(POST_TYPES.POLL, pollPostSchema);

const mediaPostSchema = new mongoose.Schema({
  mediaUrls: {
    type: [String],
    validate: [
      {
        validator: (urls) => urls.length > 0 && urls.length <= 10,
        message: "Media post must have between 1 and 10 media items",
      },
    ],
  },
  captions: {
    type: String,
    maxlength: [1000, "Caption cannot exceed 1000 characters"],
    default: "",
  },
});

const MediaPost = Post.discriminator(POST_TYPES.MEDIA, mediaPostSchema);

const eventPostSchema = new mongoose.Schema({
  eventTitle: {
    type: String,
    required: true,
    maxlength: [200, "Event title cannot exceed 200 characters"],
  },
  eventDate: {
    type: Date,
    required: true,
    validate: {
      validator: (date) => date > new Date(Date.now() + 1000 * 60), // +1 minute
      message: "Event date must be in the future",
    },
  },
  location: {
    type: String,
    maxlength: [500, "Location cannot exceed 500 characters"],
  },
  rsvp: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

// Add method to check if event is past
eventPostSchema.methods.isPast = function () {
  return new Date() > this.eventDate;
};

// Add method to RSVP to an event
eventPostSchema.methods.addRsvp = async function (userId) {
  try {
    if (this.isPast()) {
      throw new ApiError(400, "Event has already passed");
    }

    // Check if user already RSVP'd
    if (this.rsvp.some((id) => id.equals(userId))) {
      throw new ApiError(400, "User has already RSVP'd to this event");
    }

    // Add user to RSVP list
    this.rsvp.push(userId);

    return this.save();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, `Error adding RSVP: ${error.message}`);
  }
};

const EventPost = Post.discriminator(POST_TYPES.EVENT, eventPostSchema);

// Export all models
// export { Post, PollPost, MediaPost, EventPost };
export default Post;
