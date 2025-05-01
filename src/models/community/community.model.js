// import mongoose from "mongoose";

// const CommunitySchema = new mongoose.Schema(
//   {
//     communityName: {
//       type: String,
//       required: true,
//       index: true,
//     },
//     communityJoinUrl: {
//       type: String,
//       required: true,
//     },
//     // communityEmail: {
//     //   type: String,
//     //   required: true,
//     //   default: "exapmle@gmail.com",
//     // },
//     communityUsername: {
//       type: String,
//       required: [true, "Community username is required"],
//       unique: true,
//       trim: true,
//     },
//     type: {
//       type: String,
//       enum: ["Public", "Private"],
//       default: "Public",
//     },
//     membershipType: {
//       type: String,
//       enum: ["Free", "Paid"],
//       default: "Free",
//     },
//     communityDescription: {
//       type: String,
//       required: true,
//     },
//     communityCountry: {
//       type: String,
//       required: true,
//       default: "india",
//     },
//     communityProfileImage: {
//       type: String,
//     },
//     communityCoverImages: {
//       type: [String],
//     },
//     interests: {
//       type: [String],
//       validate: {
//         validator: function (v) {
//           // Each interest must be 1-30 chars, array max length 20
//           return (
//             v.length <= 20 &&
//             v.every((interest) => interest.length >= 1 && interest.length <= 30)
//           );
//         },
//         message:
//           "Interests must be between 1-30 characters, maximum 20 interests",
//       },
//       default: [],
//     },

//     // Owner of the community
//     owner: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },

//     // Community permission
//     settings: {
//       permissions: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "communityPermissions",
//       },
//     },

//     socialAccounts: {
//       instagram: { type: String, default: "" },
//       website: { type: String, default: "" },
//       googleMeet: { type: String, default: "" },
//       msTeams: { type: String, default: "" },
//       facebook: { type: String, default: "" },
//       twitter: { type: String, default: "" },
//       linkedin: { type: String, default: "" },
//     },

//     createdAt: { type: Date, default: Date.now },
//   },
//   { timestamps: true }
// );

// const Community = mongoose.model("Community", CommunitySchema);

// export default Community;

import mongoose from "mongoose";

const communitySchema = new mongoose.Schema(
  {
    communityName: {
      type: String,
      required: [true, "Community name is required"],
      trim: true,
      index: true,
    },
    communityUsername: {
      type: String,
      required: [true, "Community username is required"],
      unique: true,
      trim: true,
      index: true, // Adding index for performance on unique field
      validate: {
        validator: function (v) {
          return /^[a-zA-Z0-9_-]+$/.test(v);
        },
        message:
          "Username can only contain letters, numbers, underscores and hyphens",
      },
    },
    communityDescription: {
      type: String,
      required: [true, "Community description is required"],
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    communityType: {
      type: String,
      enum: ["public", "private"],
      default: "public",
      lowercase: true,
    },
    membershipType: {
      type: String,
      enum: ["free", "paid"],
      default: "free",
      lowercase: true,
    },
    location: {
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: "2dsphere", // Enables geospatial queries
        sparse: true, // Only index documents that have coordinates
        validate: {
          validator: function (v) {
            return v.length === 0 || v.length === 2;
          },
          message: "Coordinates must be in [longitude, latitude] format",
        },
      },
      countryCode: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: 2,
        index: true,
      },
      regionCode: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: 5,
        index: true,
      },
      formattedAddress: {
        type: String,
        trim: true,
      },
    },
    media: {
      profileImage: {
        type: String,
      },
      coverImages: {
        type: [String],
        validate: {
          validator: function (v) {
            return v.length <= 5; // Limit the number of cover images
          },
          message: "Maximum 5 cover images allowed",
        },
      },
    },
    interests: {
      type: [String],
      validate: {
        validator: function (v) {
          return (
            v.length <= 20 &&
            v.every((interest) => interest.length >= 1 && interest.length <= 30)
          );
        },
        message:
          "Interests must be between 1-30 characters, maximum 20 interests",
      },
      default: [],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Add index for performance on owner queries
    },
    permissions: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommunityPermissions",
    },
    socialAccounts: {
      instagram: {
        type: String,
        default: "",
        validate: {
          validator: function (v) {
            return (
              v === "" ||
              /^(https?:\/\/)?(www\.)?instagram\.com\/[a-zA-Z0-9_]+(\/)?$/.test(
                v
              )
            );
          },
          message: "Please enter a valid Instagram URL",
        },
      },
      website: {
        type: String,
        default: "",
        validate: {
          validator: function (v) {
            return (
              v === "" ||
              /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w.-]*)*\/?$/.test(
                v
              )
            );
          },
          message: "Please enter a valid website URL",
        },
      },
      googleMeet: { type: String, default: "" },
      msTeams: { type: String, default: "" },
      facebook: {
        type: String,
        default: "",
        validate: {
          validator: function (v) {
            return (
              v === "" ||
              /^(https?:\/\/)?(www\.)?facebook\.com\/[a-zA-Z0-9_.-]+(\/)?$/.test(
                v
              )
            );
          },
          message: "Please enter a valid Facebook URL",
        },
      },
      twitter: {
        type: String,
        default: "",
        validate: {
          validator: function (v) {
            return (
              v === "" ||
              /^(https?:\/\/)?(www\.)?twitter\.com\/[a-zA-Z0-9_]+(\/)?$/.test(v)
            );
          },
          message: "Please enter a valid Twitter URL",
        },
      },
      linkedin: {
        type: String,
        default: "",
        validate: {
          validator: function (v) {
            return (
              v === "" ||
              /^(https?:\/\/)?(www\.)?linkedin\.com\/(in|company)\/[a-zA-Z0-9_-]+(\/)?$/.test(
                v
              )
            );
          },
          message: "Please enter a valid LinkedIn URL",
        },
      },
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

    // Define compound indexes for common query patterns
    indexes: [
      {
        fields: { "location.country": 1, "location.state": 1 },
        name: "location_index",
      },
      {
        fields: { type: 1, membershipType: 1 },
        name: "community_type_index",
      },
    ],
  }
);

// Add text index for search functionality
communitySchema.index(
  {
    communityName: "text",
    communityDescription: "text",
    interests: "text",
  },
  {
    weights: {
      communityName: 10,
      communityDescription: 5,
      interests: 3,
    },
    name: "text_search_index",
  }
);

// TODO: Update
// Virtual for full community URL
communitySchema.virtual("fullJoinUrl").get(function () {
  return `https://cohorts.in/${this.communityUsername}`;
});

communitySchema.virtual("memberCount", {
  ref: "Membership",
  localField: "_id",
  foreignField: "communityId",
  count: true,
  match: { status: "active" }, // Only count active members
});

communitySchema.virtual("adminCount", {
  ref: "Membership",
  localField: "_id",
  foreignField: "communityId",
  count: true,
  match: { role: "admin", status: "active" },
});

communitySchema.virtual("paidMemberCount", {
  ref: "Membership",
  localField: "_id",
  foreignField: "communityId",
  count: true,
  match: { subscriptionStatus: "paid", status: "active" },
});

communitySchema.virtual("latestMembers", {
  ref: "Membership",
  localField: "_id",
  foreignField: "communityId",
  options: {
    sort: { joinedAt: -1 },
    limit: 5,
    populate: { path: "userId", select: "name profileImage username" },
  },
  match: { status: "active" },
});

communitySchema.virtual("topMembers", {
  ref: "Membership",
  localField: "_id",
  foreignField: "communityId",
  options: {
    sort: { "level.points": -1 },
    limit: 5,
    populate: { path: "userId", select: "name profileImage username" },
  },
  match: { status: "active" },
});

// Method to check if user is owner
communitySchema.methods.isOwner = function (userId) {
  return this.owner.toString() === userId.toString();
};

// Pre-save middleware to clean data
communitySchema.pre("save", function (next) {
  // Ensure interests are unique
  if (this.interests && this.interests.length > 0) {
    this.interests = [...new Set(this.interests)];
  }
  next();
});

// Add utility methods for location queries
communitySchema.statics.findNearby = async function (
  coordinates,
  maxDistance = 10000
) {
  if (!coordinates || coordinates.length !== 2) {
    throw new Error("Valid coordinates required");
  }

  return this.find({
    "location.coordinates": {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: coordinates,
        },
        $maxDistance: maxDistance, // in meters
      },
    },
  });
};

communitySchema.statics.findByRegion = async function (
  countryCode,
  regionCode
) {
  const query = { "location.countryCode": countryCode.toUpperCase() };

  if (regionCode) {
    query["location.regionCode"] = regionCode.toUpperCase();
  }

  return this.find(query);
};

communitySchema.statics.generateCommunityUsername = async function (
  communityName
) {
  if (!communityName || typeof communityName !== "string") {
    throw new Error("Community name is required");
  }

  // Convert spaces to hyphens and remove special characters
  let baseUsername = communityName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^a-z0-9_-]/g, "") // Only allow letters, numbers, underscores and hyphens
    .substring(0, 30); // Limit length (adjust as needed)

  // Ensure the username isn't empty after sanitization
  if (!baseUsername) {
    baseUsername = "community";
  }

  // Check if username exists
  const exists = await this.findOne({ communityUsername: baseUsername });

  // If username doesn't exist, return it
  if (!exists) return baseUsername;

  // If username exists, add a random suffix
  let uniqueUsername;
  let usernameExists;
  let attempts = 0;
  const maxAttempts = 10; // Prevent infinite loops

  do {
    attempts++;

    // Generate random suffix
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    uniqueUsername = `${baseUsername}-${randomSuffix}`.substring(0, 40); // Adjust max length as needed

    // Check if this username exists
    usernameExists = await this.findOne({ communityUsername: uniqueUsername });

    // Add safety exit condition
    if (attempts >= maxAttempts) {
      // If we've tried too many times, add timestamp for guaranteed uniqueness
      const timestamp = Date.now().toString().slice(-6);
      uniqueUsername = `${baseUsername}-${timestamp}`.substring(0, 40);
      break;
    }
  } while (usernameExists);

  return uniqueUsername;
};

const Community = mongoose.model("Community", communitySchema);

export default Community;

// EXAMPLE USAGE for virtuals
// const community = await Community.findById(id)
// .populate('memberCount')
// .populate('adminCount')
// .populate('paidMemberCount')
// .populate('latestMembers')
// .populate('topMembers');
