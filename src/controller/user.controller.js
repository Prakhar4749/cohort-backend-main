import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import axios from "axios";

import { appEnvConfigs } from "../configs/env_config.js";

import { oauth2Client } from "../utils/oauthClients.js";
import { AsyncHandler } from "../utils/server-utils.js";

import User from "../models/users/user.model.js";
import { createDefaultSettings } from '../services/settings.service.js';


// Signup Controller with AsyncHandler
export const signup = AsyncHandler(async (req, res) => {
  const { 
    username, 
    email, 
    password,
    firstName,
    lastName,
    livelink,
    state,
    bio,
    profilePhoto,
    coverPhoto,
    preferences, 
    verifiedNumber,
    socialAccounts
  } = req.body;

  // Check for existing user (email or username) - do both checks at once
  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  }).lean();
  
  if (existingUser) {
    return res.status(400).json({ 
      success: false,
      message: existingUser.email === email 
        ? "Email already exists" 
        : "Username already taken" 
    });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user with all provided fields
  const newUser = await User.create({
    username, 
    email, 
    password: hashedPassword,
    // Add optional fields if they exist in the request
    ...(firstName && { firstName }),
    ...(lastName && { lastName }),
    ...(livelink && { livelink }),
    ...(state && { state }),
    ...(bio && { bio }),
    ...(profilePhoto && { profilePhoto }),
    ...(coverPhoto && { coverPhoto }),
    ...(preferences && { preferences }),
    ...(verifiedNumber && { verifiedNumber }),
    ...(socialAccounts && { socialAccounts })
    // Note: contribution, settings, followers, followings are handled differently
    // as they have default values or are created separately
  });

  // Create related documents
  await createDefaultSettings(newUser._id);
  
  // Generate JWT token
  const token = jwt.sign(
    { id: newUser._id }, 
    appEnvConfigs.JWT_SECRET, 
    { expiresIn: "7d" }
  );

  // Get updated user (without password)
  const user = await User.findById(newUser._id)
    .select('-password')
    .lean();

  return res.status(201).json({ 
    success: true,
    message: "User created successfully",
    token, 
    user 
  });
});

// **Login Controller**
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ message: "Error in Login", error: error.message });
  }
};

// **OAuth Login (Google, Facebook, X)**
export const oauthLogin = async (req, res) => {
  const { code, provider } = req.body;

  console.log("OAuth Code:", code);
  console.log("Provider:", provider);

  try {
    let email, name, picture, providerId;

    if (provider === "google") {
      try {
        const googleRes = await oauth2Client.getToken(code);
        await oauth2Client.setCredentials(googleRes.tokens);

        console.log("Google Token Response:", googleRes.tokens);

        const userRes = await axios.get(
          `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`
        );
        ({ email, name, picture, id: providerId } = userRes.data);
      } catch (error) {
        console.error(
          "Google OAuth Error:",
          error.response?.data || error.message
        );
        return res
          .status(500)
          .json({ message: "Google OAuth Failed", error: error.message });
      }
    } else if (provider === "facebook") {
      try {
        const fbRes = await axios.get(
          `https://graph.facebook.com/v12.0/me?fields=id,name,email,picture&access_token=${code}`
        );
        ({ email, name, id: providerId, picture } = fbRes.data);
        picture = picture.data.url;
      } catch (error) {
        console.error(
          "Facebook OAuth Error:",
          error.response?.data || error.message
        );
        return res
          .status(500)
          .json({ message: "Facebook OAuth Failed", error: error.message });
      }
    } else if (provider === "x") {
      try {
        const twitterRes = await axios.get(
          "https://api.twitter.com/2/users/me",
          { headers: { Authorization: `Bearer ${code}` } }
        );
        ({ name, id: providerId, picture } = twitterRes.data);

        console.log("Twitter OAuth Response:", twitterRes.data);

        email = `${name.replace(" ", "").toLowerCase()}@twitter.com`; // Twitter often doesn't return email
      } catch (error) {
        console.error(
          "Twitter OAuth Error:",
          error.response?.data || error.message
        );
        return res
          .status(500)
          .json({ message: "Twitter OAuth Failed", error: error.message });
      }
    } else {
      return res.status(400).json({ message: "Invalid provider" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        name,
        email,
        image: picture,
        [`${provider}Id`]: providerId,
      });
      await user.save();

      // Create default settings for new OAuth users
      const settingsCreated = await createDefaultSettings(user._id);
      if (!settingsCreated) {
        await User.findByIdAndDelete(user._id);
        return res.status(500).json({ message: "Error creating user settings" });
      }
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ token, user });
  } catch (error) {
    console.error("OAuth Authentication Error:", error);
    res
      .status(500)
      .json({ message: "OAuth Authentication Failed", error: error.message });
  }
};

class UserController {
  getUserAccount = AsyncHandler(async (req, res) => {
    const userId = req.params.user_id || req.user._id; // Get from params or authenticated user

    // Fetch only the relevant fields for settings
    const userAccount = await User.findById(userId)
      .select('firstName lastName username email state bio profilePhoto coverPhoto contribution.total livelink preferences createdAt recentActivity')
      .populate({
        path: 'recentActivity',
        select: 'content images likeCount commentCount shareCount viewsCount postType editedAt' // specify the fields you want
      })
      .populate({
        path: 'followers',
        select: 'followersCount'
      })
      .populate({
        path: 'followings',
        select: 'followingCount'
      })
      .lean();

    if (!userAccount) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: userAccount
    });
  });

  updatePreferences = AsyncHandler(async (req, res) => {
    const userId = req.params.user_id || req.user._id;
    const  { newPreferences }  = req.body;
    
    if (!newPreferences || !Array.isArray(newPreferences)) {
      res.status(400);
      throw new Error('New preferences must be provided as an array');
    }
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    
    // Process new preferences - convert to lowercase, trim, and remove duplicates
    const processedPreferences = newPreferences.map(pref => 
      pref.trim().toLowerCase()
    ).filter(pref => pref !== "");
    
    // If user has no preferences yet or empty array
    if (!user.preferences || user.preferences.length === 0 || 
        (user.preferences.length === 1 && user.preferences[0] === "")) {
      user.preferences = processedPreferences;
    } else {
      // Add new preferences avoiding duplicates
      const existingPreferences = new Set(user.preferences);
      processedPreferences.forEach(pref => {
        existingPreferences.add(pref);
      });
      user.preferences = Array.from(existingPreferences);
    }
    
    // Save the updated user
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
  });

  
  // Deletes a specific preference from user preferences
  
  deletePreferences = AsyncHandler(async (req, res) => {
    const userId = req.params.user_id || req.user._id;
    const { preferences } = req.body;
    
    // Check if preferences is provided as a string or an array
    let prefsToDelete = [];
    
    if (typeof preferences === 'string') {
      // Single preference as string
      prefsToDelete = [preferences.trim().toLowerCase()];
    } else if (Array.isArray(preferences)) {
      // Multiple preferences as array
      prefsToDelete = preferences.map(pref => 
        typeof pref === 'string' ? pref.trim().toLowerCase() : ''
      ).filter(pref => pref !== '');
    } else {
      res.status(400);
      throw new Error('Preferences to delete must be provided as a string or an array of strings');
    }
    
    if (prefsToDelete.length === 0) {
      res.status(400);
      throw new Error('No valid preferences provided for deletion');
    }
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    
    // Check if user has preferences
    if (!user.preferences || user.preferences.length === 0 || 
        (user.preferences.length === 1 && user.preferences[0] === "")) {
      res.status(400);
      throw new Error('User has no preferences to delete');
    }
    
    // Track which preferences were found and deleted
    const deletedPrefs = [];
    const notFoundPrefs = [];
    
    // Create a set of preferences for easier lookup
    const prefsSet = new Set(prefsToDelete);
    
    // Filter out the preferences to delete
    const originalPrefs = [...user.preferences];
    user.preferences = user.preferences.filter(pref => {
      const shouldDelete = prefsSet.has(pref);
      if (shouldDelete) {
        deletedPrefs.push(pref);
      }
      return !shouldDelete;
    });
    
    // Find which preferences were not found
    prefsToDelete.forEach(pref => {
      if (!originalPrefs.includes(pref)) {
        notFoundPrefs.push(pref);
      }
    });
    
    // If nothing was deleted
    if (deletedPrefs.length === 0) {
      res.status(404);
      throw new Error('None of the specified preferences were found in user preferences');
    }
    
    // If all preferences were deleted, keep an empty string as default
    if (user.preferences.length === 0) {
      user.preferences = [""];
    }
    
    // Save the updated user
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Preferences deleted successfully',
      deletedPreferences: deletedPrefs,
      notFoundPreferences: notFoundPrefs.length > 0 ? notFoundPrefs : undefined,
      currentPreferences: user.preferences
    });
  });

  


}
export default new UserController();

