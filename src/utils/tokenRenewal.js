// utils/tokenRenewal.js

import jwt from 'jsonwebtoken';
import  User  from '../models/users/user.model.js';
import { ApiError, ApiResponse, AsyncHandler } from "../utils/responseUtils.js";
import { appEnvConfigs } from "../configs/env_config.js";


export const renewToken = AsyncHandler(async (req, res, next) => {
  // Only proceed if the user is authenticated
  if (!req.user) {
    return next();
  }

  const userId = req.user.id;
  console.log('token renew')
  
  // Get the current token from the Authorization header
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return next();
  }
  
  // Decode token to check expiration time
  const decodedToken = jwt.verify(token, appEnvConfigs.JWT_SECRET, { ignoreExpiration: true });
  
  // Check if token is about to expire (e.g., within 24 hours)
  const RENEW_THRESHOLD = 24 * 60 * 60; // 24 hours in seconds
  const currentTime = Math.floor(Date.now() / 1000);
  
  // Only renew if token is closer to expiry than the threshold
  if (decodedToken.exp - currentTime > RENEW_THRESHOLD) {
    return next();
  }
  
  // Token is close to expiry, find user to ensure they still exist
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(401, "User not found during token renewal");
  }
  
  // Generate a new token
  const newToken = jwt.sign({ id: user._id }, appEnvConfigs.JWT_SECRET, {
    expiresIn: "7d",
  });
  
  // Set the new token in the response header
  res.setHeader("Authorization", `Bearer ${newToken}`);
  
  // Add token to response body for client to update storage
  res.locals.newToken = newToken;
  
  // Continue to the actual request handler
  next();
});