// import mongoose from "mongoose";

// const userSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       trim: true,
//       default: "",
//     },
//     email: {
//       type: String,
//       required: [true, "Email is required"],
//       unique: true,
//       trim: true,
//       lowercase: true,
//       match: [/\S+@\S+\.\S+/, "Please enter a valid email address"],
//     },
//     password: {
//       type: String,
//       required: [true, "Password is required"],
//       minlength: [8, "Password must be at least 8 characters long"],
//     },

//     username: {
//       type: String,
//       required: [true, "Username is required"],
//       unique: true,
//       trim: true,
//     },

//     livelink: {
//       type: String,
//       default: "",
//     },
//     state: {
//       type: String,
//       trim: true,
//       default: "",
//     },
//     bio: {
//       type: String,
//       trim: true,
//       default: "",
//     },
//     profilePhoto: {
//       type: String,
//       default: "",
//     },
//     coverPhoto: {
//       type: String,
//       default: "",
//     },
//     interests: {
//       type: [
//         {
//           type: String,
//           trim: true,
//           lowercase: true,
//         },
//       ],
//       default: [],
//     },
//     verifiedNumber: {
//       type: Number,
//       default: 0,
//     },
//     contribution: {
//       posts: {
//         type: Number,
//         default: 0,
//       },
//       comments: {
//         type: Number,
//         default: 0,
//       },
//       likes: {
//         type: Number,
//         default: 0,
//       },
//       shares: {
//         type: Number,
//         default: 0,
//       },
//       total: {
//         type: Number,
//         default: 0,
//       },
//     },
//     settings: {
//       permissions: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "userPermissions",
//       },
//     },

//     socialAccounts: {
//       google: {
//         type: String,
//         default: "",
//       },
//       instagram: {
//         type: String,
//         default: "",
//       },
//       facebook: {
//         type: String,
//         default: "",
//       },
//       twitter: {
//         type: String,
//         default: "",
//       },
//     },
//     googleId: {
//       type: String,
//       default: null,
//       sparse: true // Allow multiple null values
//     },
//     facebookId: {
//       type: String,
//       default: null,
//       sparse: true
//     },
//     twitterId: {
//       type: String,
//       default: null,
//       sparse: true
//     },

//     recentActivity: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],

//     // Payment methods for future payments
//     paymentMethod: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "userPaymentMethod",
//       },
//     ],

//     // Not needed now.
//     // followers: {
//     //   type: mongoose.Schema.Types.ObjectId,
//     //   ref: "UserFollower",
//     // },
//     // followings: {
//     //   type: mongoose.Schema.Types.ObjectId,
//     //   ref: "UserFollowing",
//     // },

//     createdAt: { type: Date, default: Date.now },
//   },
//   { timestamps: true }
// );

// userSchema.index({ email: 1 });
// userSchema.index({ username: 1 });
// userSchema.index({ googleId: 1 }, { sparse: true });
// userSchema.index({ facebookId: 1 }, { sparse: true });
// userSchema.index({ twitterId: 1 }, { sparse: true });

// // Use virtuals to calculate total contributions dynamically
// // This will not be stored in the database, but can be used in queries and responses
// userSchema.virtual("contribution.total").get(function () {
//   return (
//     this.contribution.posts +
//     this.contribution.comments +
//     this.contribution.likes +
//     this.contribution.shares
//   );
// });

// // // Add this pre-save hook before creating the model
// // userSchema.pre("save", function (next) {
// //   // Calculate total contributions
// //   this.contribution.total =
// //     this.contribution.posts +
// //     this.contribution.comments +
// //     this.contribution.likes +
// //     this.contribution.shares;

// //   next();
// // });

// const User = mongoose.model("User", userSchema);
// export default User;

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import validator from "validator";

const userSchema = new mongoose.Schema(
  {
    // Basic information
    name: {
      type: String,
      trim: true,
      required: [true, "Name is required"],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: validator.isEmail,
        message: "Please enter a valid email address",
      },
      index: true,
    },
    password: {
      type: String,
      required: function () {
        // Password only required if not using OAuth
        return !this.googleId && !this.facebookId && !this.twitterId;
      },
      minlength: [8, "Password must be at least 8 characters long"],
      select: false, // Don't return password in queries by default
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [
        /^[a-zA-Z0-9_\.]+$/,
        "Username can only contain letters, numbers, underscores and dots",
      ],
      index: true,
    },

    // Profile data
    livelink: {
      type: String,
      default: "",
      validate: {
        validator: function (value) {
          return value === "" || validator.isURL(value);
        },
        message: "Please provide a valid URL for your live link",
      },
    },
    state: {
      type: String,
      trim: true,
      default: "",
      maxlength: [100, "State cannot exceed 100 characters"],
    },
    bio: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Bio cannot exceed 500 characters"],
    },
    profilePhoto: {
      type: String,
      default: "/default/profile.png", // Default profile photo path
    },
    coverPhoto: {
      type: String,
      default: "/default/cover.png", // Default cover photo path
    },
    interests: {
      type: [String],
      validate: {
        validator: function (v) {
          // Each interest must be 1-30 chars, array max length 20
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

    // Account status
    verifiedNumber: {
      type: Number,
      default: 0,
      enum: [0, 1, 2], // 0: not verified, 1: email verified, 2: fully verified
    },
    accountStatus: {
      type: String,
      enum: ["active", "suspended", "deleted"],
      default: "active",
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },

    // Contribution metrics
    contribution: {
      posts: {
        type: Number,
        default: 0,
        min: 0,
      },
      comments: {
        type: Number,
        default: 0,
        min: 0,
      },
      likes: {
        type: Number,
        default: 0,
        min: 0,
      },
      shares: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Settings and references
    settings: {
      permissions: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "userPermissions",
      },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        activity: { type: Boolean, default: true },
      },
    },

    // Social accounts and OAuth IDs
    socialAccounts: {
      google: { type: String, default: "" },
      instagram: { type: String, default: "" },
      facebook: { type: String, default: "" },
      twitter: { type: String, default: "" },
    },

    // OAuth provider IDs
    googleId: {
      type: String,
      sparse: true,
      index: true,
    },
    facebookId: {
      type: String,
      sparse: true,
      index: true,
    },
    twitterId: {
      type: String,
      sparse: true,
      index: true,
    },

    // Activity tracking
    recentActivity: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        // Add timestamps to track when activities were added
        _id: false,
        addedAt: { type: Date, default: Date.now },
      },
    ],

    // Payment methods
    paymentMethods: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "userPaymentMethod",
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // Include virtuals when converting to JSON
    toObject: { virtuals: true }, // Include virtuals when converting to objects
  }
);

// Indexes for performance
userSchema.index({ name: "text", bio: "text" }); // Text search index
userSchema.index({ createdAt: -1 }); // For sorting by newest
userSchema.index({ "contribution.total": -1 }); // For sorting by contribution

// Virtual for total contributions
userSchema.virtual("contribution.total").get(function () {
  return (
    this.contribution.posts +
    this.contribution.comments +
    this.contribution.likes +
    this.contribution.shares
  );
});

// Method to check if password matches
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate a username from email
userSchema.statics.generateUsername = async function (baseUsername) {
  // Sanitize the base username
  let username = baseUsername
    .toLowerCase()
    .replace(/[^a-z0-9_\.]/g, "")
    .substring(0, 20);

  // Check if username exists
  const exists = await this.findOne({ username });

  if (!exists) return username;

  // If username exists, add a random suffix
  let uniqueUsername;
  let exists2;

  do {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    uniqueUsername = `${username}${randomSuffix}`.substring(0, 30);
    exists2 = await this.findOne({ username: uniqueUsername });
  } while (exists2);

  return uniqueUsername;
};

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified("password") || !this.password) return next();

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password with the salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware to format interests before saving
userSchema.pre("save", function (next) {
  if (this.isModified("interests")) {
    // Trim, lowercase, and remove duplicates
    this.interests = [
      ...new Set(
        this.interests
          .map((interest) => interest.trim().toLowerCase())
          .filter((interest) => interest.length > 0)
      ),
    ];
  }
  next();
});

// Update lastActive timestamp on document update
userSchema.pre("findOneAndUpdate", function (next) {
  this.set({ lastActive: Date.now() });
  next();
});

userSchema.set("toObject", {
  virtuals: true,
  versionKey: false, // removes __v
  transform: (_, ret) => {
    delete ret._id;
    delete ret.password; // Remove password from the response
    return ret;
  },
});

userSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    delete ret._id;
    delete ret.password; // Remove password from the response
    return ret;
  },
});


const User = mongoose.model("User", userSchema);
export default User;
