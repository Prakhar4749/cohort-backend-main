// services/settings.service.js
import { userPermissions } from "../models/users/user.permission.model.js";
import UserFollower from "../models/users/user.followers.model.js";
import UserFollowing from "../models/users/user.followings.model.js";
import mongoose from "mongoose";
import { AsyncHandler } from "../utils/server-utils.js";

export const createDefaultSettings = AsyncHandler(async (userId) => {
  // Create all documents
  const permissions = new userPermissions({ user: userId });
  const followers = new UserFollower({ user: userId });
  const followings = new UserFollowing({ user: userId });
  
  // Save all documents
  await permissions.save();
  await followers.save();
  await followings.save();
  
  // Update the user with references
  await mongoose.model("User").findByIdAndUpdate(
    userId,
    {
      $set: {
        "settings.permissions": permissions._id,
        followers: followers._id,
        followings: followings._id
      }
    }
  );
  
  return { permissions, followers, followings };
});