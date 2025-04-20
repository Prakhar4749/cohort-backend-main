import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Joi from "joi";
import sanitize from "mongo-sanitize";
import lodash from "lodash";
import rateLimit from "express-rate-limit";

// import passport from "../configs/passport.js";
import User from "../models/users/user.model.js";
import { appEnvConfigs } from "../configs/env_config.js";
import { createDefaultSettings } from "../services/settings.service.js";
import {
  AsyncHandler,
  ApiError,
  errorResponse,
  successResponse,
} from "../utils/responseUtils.js";

// Signup controller
export const signup = AsyncHandler(async (req, res) => {
  console.log("Signup request body:", req.body); // Debugging line
  const { name, email, password, interests } = req.body;

  if (!name || !email || !password || !interests) {
    throw new ApiError(400, "Name, email, password and interests are required");
  }
  if (!Array.isArray(interests) || interests.length === 0) {
    throw new ApiError(400, "Interests must be a non-empty array");
  }

  // Check if user with same email exists
  const existingUser = await User.findOne({ email }).lean();
  if (existingUser) {
    throw new ApiError(409, "Email already in use");
  }

  // Generate unique username from name
  const username = await User.generateUsername(name);

  // Add this before hashing
  if (password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters long");
  }

  // Create user
  const newUser = await User.create({
    name,
    email,
    password,
    username,
    interests: interests,
  });

  // Create default settings
  await createDefaultSettings(newUser._id);

  // Create JWT
  const token = jwt.sign({ id: newUser._id }, appEnvConfigs.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.setHeader("Authorization", `Bearer ${token}`);
  return successResponse(
    res,
    newUser.toJSON(),
    "User created successfully",
    201
  );
});

// Signup Controller with AsyncHandler
// export const signup = AsyncHandler(async (req, res) => {
//   const {
//     name,
//     email,
//     password,
//     interests,

//     username,
//     livelink,
//     state,
//     bio,
//     profilePhoto,
//     coverPhoto,
//     preferences,
//     verifiedNumber,
//     socialAccounts,
//   } = req.body;

//   // Check for existing user (email or username) - do both checks at once
//   const existingUser = await User.findOne({
//     $or: [{ email }, { username }],
//   }).lean();

//   if (existingUser) {
//     return res.status(400).json({
//       success: false,
//       message:
//         existingUser.email === email
//           ? "Email already exists"
//           : "Username already taken",
//     });
//   }

//   // Hash password
//   const hashedPassword = await bcrypt.hash(password, 10);

//   // Create user with all provided fields
//   const newUser = await User.create({
//     username,
//     email,
//     password: hashedPassword,
//     // Add optional fields if they exist in the request
//     ...(firstName && { firstName }),
//     ...(lastName && { lastName }),
//     ...(livelink && { livelink }),
//     ...(state && { state }),
//     ...(bio && { bio }),
//     ...(profilePhoto && { profilePhoto }),
//     ...(coverPhoto && { coverPhoto }),
//     ...(preferences && { preferences }),
//     ...(verifiedNumber && { verifiedNumber }),
//     ...(socialAccounts && { socialAccounts }),
//     // Note: contribution, settings, followers, followings are handled differently
//     // as they have default values or are created separately
//   });

//   // Create related documents
//   await createDefaultSettings(newUser._id);

//   // Generate JWT token
//   const token = jwt.sign({ id: newUser._id }, appEnvConfigs.JWT_SECRET, {
//     expiresIn: "7d",
//   });

//   // Get updated user (without password)
//   const user = await User.findById(newUser._id).select("-password").lean();

//   return res.status(201).json({
//     success: true,
//     message: "User created successfully",
//     token,
//     user,
//   });
// });

// **Login Controller**

export const login = AsyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user.password) {
    throw new ApiError(
      400,
      "Account was created via OAuth. Please login using Google/Facebook/X."
    );
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  const token = jwt.sign({ id: user._id }, appEnvConfigs.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.setHeader("Authorization", `Bearer ${token}`);
  return successResponse(res, user.toJSON(), "Login successful");
});

// export const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch)
//       return res.status(400).json({ message: "Invalid credentials" });

//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: "7d",
//     });

//     res.json({ token, user });
//   } catch (error) {
//     res.status(500).json({ message: "Error in Login", error: error.message });
//   }
// };

// **OAuth Controller**
// TODO: Uncomment when all the API secrets and keys are available.
// export const oauthLogin = (req, res, next) => {
//   const { provider } = req.body;

//   // Map provider names to passport strategy names
//   const providerMap = {
//     google: "google",
//     facebook: "facebook",
//     x: "twitter", // Map "x" to "twitter" for the strategy name
//   };

//   const strategyName = providerMap[provider];

//   if (!provider || !strategyName) {
//     return errorResponse(res, "Invalid OAuth provider", 400);
//   }

//   // Authenticate with the appropriate strategy
//   passport.authenticate(strategyName, {
//     scope:
//       strategyName === "google"
//         ? ["profile", "email"]
//         : strategyName === "facebook"
//           ? ["email"]
//           : undefined,
//   })(req, res, next);
// };

// **OAuth Login (Google, Facebook, X)**

// export const oauthLogin = async (req, res) => {
//   const { code, provider } = req.body;

//   console.log("OAuth Code:", code);
//   console.log("Provider:", provider);

//   try {
//     let email, name, picture, providerId;

//     if (provider === "google") {
//       try {
//         const googleRes = await oauth2Client.getToken(code);
//         await oauth2Client.setCredentials(googleRes.tokens);

//         console.log("Google Token Response:", googleRes.tokens);

//         const userRes = await axios.get(
//           `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`
//         );
//         ({ email, name, picture, id: providerId } = userRes.data);
//       } catch (error) {
//         console.error(
//           "Google OAuth Error:",
//           error.response?.data || error.message
//         );
//         return res
//           .status(500)
//           .json({ message: "Google OAuth Failed", error: error.message });
//       }
//     } else if (provider === "facebook") {
//       try {
//         const fbRes = await axios.get(
//           `https://graph.facebook.com/v12.0/me?fields=id,name,email,picture&access_token=${code}`
//         );
//         ({ email, name, id: providerId, picture } = fbRes.data);
//         picture = picture.data.url;
//       } catch (error) {
//         console.error(
//           "Facebook OAuth Error:",
//           error.response?.data || error.message
//         );
//         return res
//           .status(500)
//           .json({ message: "Facebook OAuth Failed", error: error.message });
//       }
//     } else if (provider === "x") {
//       try {
//         const twitterRes = await axios.get(
//           "https://api.twitter.com/2/users/me",
//           { headers: { Authorization: `Bearer ${code}` } }
//         );
//         ({ name, id: providerId, picture } = twitterRes.data);

//         console.log("Twitter OAuth Response:", twitterRes.data);

//         email = `${name.replace(" ", "").toLowerCase()}@twitter.com`; // Twitter often doesn't return email
//       } catch (error) {
//         console.error(
//           "Twitter OAuth Error:",
//           error.response?.data || error.message
//         );
//         return res
//           .status(500)
//           .json({ message: "Twitter OAuth Failed", error: error.message });
//       }
//     } else {
//       return res.status(400).json({ message: "Invalid provider" });
//     }

//     let user = await User.findOne({ email });

//     if (!user) {
//       user = new User({
//         name,
//         email,
//         image: picture,
//         [`${provider}Id`]: providerId,
//       });
//       await user.save();

//       // Create default settings for new OAuth users
//       const settingsCreated = await createDefaultSettings(user._id);
//       if (!settingsCreated) {
//         await User.findByIdAndDelete(user._id);
//         return res
//           .status(500)
//           .json({ message: "Error creating user settings" });
//       }
//     }

//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: "7d",
//     });

//     res.json({ token, user });
//   } catch (error) {
//     console.error("OAuth Authentication Error:", error);
//     res
//       .status(500)
//       .json({ message: "OAuth Authentication Failed", error: error.message });
//   }
// };

// Input validation schemas

// User Controller Class
const preferencesSchema = Joi.object({
  newPreferences: Joi.array()
    .items(Joi.string().trim().min(1).max(50))
    .min(1)
    .required(),
});

const deletePreferencesSchema = Joi.object({
  preferences: Joi.alternatives()
    .try(
      Joi.string().trim().min(1).max(50),
      Joi.array().items(Joi.string().trim().min(1).max(50)).min(1)
    )
    .required(),
});

// Rate limiter for preference updates
export const preferenceRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: "Too many preference updates, please try again later",
});

class UserController {
  // Get user account details
  getUserAccount = AsyncHandler(async (req, res) => {
    const userId = req.params.user_id || req.user._id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return errorResponse(res, "Invalid user ID format", 400);
    }

    // Sanitize input to prevent NoSQL injection
    const sanitizedUserId = sanitize(userId);

    // Add caching headers
    res.set("Cache-Control", "private, max-age=300"); // Cache for 5 minutes

    // Use projection for better performance
    const userAccount = await User.findById(sanitizedUserId)
      .select({
        firstName: 1,
        lastName: 1,
        username: 1,
        email: 1,
        state: 1,
        bio: 1,
        profilePhoto: 1,
        coverPhoto: 1,
        "contribution.total": 1,
        livelink: 1,
        interests: 1,
        createdAt: 1,
        recentActivity: 1,
      })
      .populate({
        path: "recentActivity",
        select:
          "content images likeCount commentCount shareCount viewsCount postType editedAt",
        options: { limit: 5, sort: { createdAt: -1 } }, // Limit to latest 5 activities
      })
      .populate({
        path: "followers",
        select: "followersCount",
      })
      .populate({
        path: "followings",
        select: "followingCount",
      })
      .lean({ virtuals: true });

    if (!userAccount) {
      return errorResponse(res, "User not found", 404);
    }

    // Add security headers
    res.set("Content-Security-Policy", "default-src 'self'");

    return successResponse(
      res,
      userAccount,
      "User account retrieved successfully"
    );
  });

  // Update user preferences
  updatePreferences = AsyncHandler(async (req, res) => {
    const userId = req.params.user_id || req.user._id;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return errorResponse(res, "Invalid user ID format", 400);
    }

    // Validate input using Joi
    const { error, value } = preferencesSchema.validate(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message, 400);
    }

    // Sanitize input
    const sanitizedUserId = sanitize(userId);
    const { newPreferences } = value;

    // Process preferences - move this logic to a service layer in a larger application
    const processedPreferences = lodash.uniq(
      newPreferences.map((pref) => pref.trim().toLowerCase()).filter(Boolean)
    );

    // Find and update in one operation for better performance
    const updatedUser = await User.findByIdAndUpdate(
      sanitizedUserId,
      {
        $addToSet: { interests: { $each: processedPreferences } },
      },
      { new: true, runValidators: true, select: "interests" }
    );

    if (!updatedUser) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(
      res,
      { preferences: updatedUser.interests },
      "Preferences updated successfully"
    );
  });

  // Delete user preferences
  deletePreferences = AsyncHandler(async (req, res) => {
    const userId = req.params.user_id || req.user._id;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return errorResponse(res, "Invalid user ID format", 400);
    }

    // Validate input using Joi
    const { error, value } = deletePreferencesSchema.validate(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message, 400);
    }

    // Sanitize input
    const sanitizedUserId = sanitize(userId);
    const { preferences } = value;

    // Normalize preferences to array
    const prefsToDelete = Array.isArray(preferences)
      ? preferences
      : [preferences];

    // Process preferences
    const normalizedPrefs = prefsToDelete
      .map((pref) => pref.trim().toLowerCase())
      .filter(Boolean);

    if (normalizedPrefs.length === 0) {
      return errorResponse(
        res,
        "No valid preferences provided for deletion",
        400
      );
    }

    // Find user first to check if they exist and have preferences
    const user = await User.findById(sanitizedUserId).select("interests");

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    if (!user.interests || user.interests.length === 0) {
      return errorResponse(res, "User has no preferences to delete", 400);
    }

    // Track which preferences were found and deleted
    const originalPrefs = [...user.interests];
    const deletedPrefs = [];
    const notFoundPrefs = [];

    // Find which preferences exist to delete
    normalizedPrefs.forEach((pref) => {
      if (originalPrefs.includes(pref)) {
        deletedPrefs.push(pref);
      } else {
        notFoundPrefs.push(pref);
      }
    });

    if (deletedPrefs.length === 0) {
      return errorResponse(
        res,
        "None of the specified preferences were found in user preferences",
        404
      );
    }

    // Update user preferences in one operation
    const updatedUser = await User.findByIdAndUpdate(
      sanitizedUserId,
      {
        $pull: { interests: { $in: deletedPrefs } },
      },
      { new: true, runValidators: true }
    );

    // If all preferences were deleted, ensure there's at least an empty entry
    if (updatedUser.interests.length === 0) {
      updatedUser.interests = [""];
      await updatedUser.save();
    }

    return successResponse(
      res,
      {
        deletedPreferences: deletedPrefs,
        notFoundPreferences:
          notFoundPrefs.length > 0 ? notFoundPrefs : undefined,
        currentPreferences: updatedUser.interests,
      },
      "Preferences deleted successfully"
    );
  });

  // Method to update profile info
  updateProfileInfo = AsyncHandler(async (req, res) => {
    const userId = req.params.user_id || req.user._id;

    // Define schema for allowed profile fields
    const profileSchema = Joi.object({
      name: Joi.string().trim().min(1).max(50),
      bio: Joi.string().trim().max(500),
      state: Joi.string().trim().max(100),
      livelink: Joi.string().trim().uri().max(255).allow(""),
    }).min(1); // At least one field must be provided

    // Validate input
    const { error, value } = profileSchema.validate(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message, 400);
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      sanitize(userId),
      { $set: value },
      { new: true, runValidators: true, select: Object.keys(value).join(" ") }
    );

    if (!updatedUser) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(res, updatedUser, "Profile updated successfully");
  });
}

export default new UserController();

// class UserController {
//   getUserAccount = AsyncHandler(async (req, res) => {
//     const userId = req.params.user_id || req.user._id; // Get from params or authenticated user

//     // Fetch only the relevant fields for settings
//     const userAccount = await User.findById(userId)
//       .select(
//         "firstName lastName username email state bio profilePhoto coverPhoto contribution.total livelink preferences createdAt recentActivity"
//       )
//       .populate({
//         path: "recentActivity",
//         select:
//           "content images likeCount commentCount shareCount viewsCount postType editedAt", // specify the fields you want
//       })
//       .populate({
//         path: "followers",
//         select: "followersCount",
//       })
//       .populate({
//         path: "followings",
//         select: "followingCount",
//       })
//       .lean();

//     if (!userAccount) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: userAccount,
//     });
//   });

//   updatePreferences = AsyncHandler(async (req, res) => {
//     const userId = req.params.user_id || req.user._id;
//     const { newPreferences } = req.body;

//     if (!newPreferences || !Array.isArray(newPreferences)) {
//       res.status(400);
//       throw new Error("New preferences must be provided as an array");
//     }

//     // Find the user
//     const user = await User.findById(userId);

//     if (!user) {
//       res.status(404);
//       throw new Error("User not found");
//     }

//     // Process new preferences - convert to lowercase, trim, and remove duplicates
//     const processedPreferences = newPreferences
//       .map((pref) => pref.trim().toLowerCase())
//       .filter((pref) => pref !== "");

//     // If user has no preferences yet or empty array
//     if (
//       !user.interests ||
//       user.interests.length === 0 ||
//       (user.interests.length === 1 && user.interests[0] === "")
//     ) {
//       user.interests = processedPreferences;
//     } else {
//       // Add new preferences avoiding duplicates
//       const existingPreferences = new Set(user.interests);
//       processedPreferences.forEach((pref) => {
//         existingPreferences.add(pref);
//       });
//       user.interests = Array.from(existingPreferences);
//     }

//     // Save the updated user
//     await user.save();

//     res.status(200).json({
//       success: true,
//       message: "Preferences updated successfully",
//       preferences: user.interests,
//     });
//   });

//   // Deletes a specific preference from user preferences

//   deletePreferences = AsyncHandler(async (req, res) => {
//     const userId = req.params.user_id || req.user._id;
//     const { preferences } = req.body;

//     // Check if preferences is provided as a string or an array
//     let prefsToDelete = [];

//     if (typeof preferences === "string") {
//       // Single preference as string
//       prefsToDelete = [preferences.trim().toLowerCase()];
//     } else if (Array.isArray(preferences)) {
//       // Multiple preferences as array
//       prefsToDelete = preferences
//         .map((pref) =>
//           typeof pref === "string" ? pref.trim().toLowerCase() : ""
//         )
//         .filter((pref) => pref !== "");
//     } else {
//       res.status(400);
//       throw new Error(
//         "Preferences to delete must be provided as a string or an array of strings"
//       );
//     }

//     if (prefsToDelete.length === 0) {
//       res.status(400);
//       throw new Error("No valid preferences provided for deletion");
//     }

//     // Find the user
//     const user = await User.findById(userId);

//     if (!user) {
//       res.status(404);
//       throw new Error("User not found");
//     }

//     // Check if user has preferences
//     if (
//       !user.interests ||
//       user.interests.length === 0 ||
//       (user.interests.length === 1 && user.interests[0] === "")
//     ) {
//       res.status(400);
//       throw new Error("User has no preferences to delete");
//     }

//     // Track which preferences were found and deleted
//     const deletedPrefs = [];
//     const notFoundPrefs = [];

//     // Create a set of preferences for easier lookup
//     const prefsSet = new Set(prefsToDelete);

//     // Filter out the preferences to delete
//     const originalPrefs = [...user.interests];
//     user.interests = user.interests.filter((pref) => {
//       const shouldDelete = prefsSet.has(pref);
//       if (shouldDelete) {
//         deletedPrefs.push(pref);
//       }
//       return !shouldDelete;
//     });

//     // Find which preferences were not found
//     prefsToDelete.forEach((pref) => {
//       if (!originalPrefs.includes(pref)) {
//         notFoundPrefs.push(pref);
//       }
//     });

//     // If nothing was deleted
//     if (deletedPrefs.length === 0) {
//       res.status(404);
//       throw new Error(
//         "None of the specified preferences were found in user preferences"
//       );
//     }

//     // If all preferences were deleted, keep an empty string as default
//     if (user.interests.length === 0) {
//       user.interests = [""];
//     }

//     // Save the updated user
//     await user.save();

//     res.status(200).json({
//       success: true,
//       message: "Preferences deleted successfully",
//       deletedPreferences: deletedPrefs,
//       notFoundPreferences: notFoundPrefs.length > 0 ? notFoundPrefs : undefined,
//       currentPreferences: user.interests,
//     });
//   });
// }
// export default new UserController();
