// config/passport.js
import passport from "passport";
import crypto from "crypto";

import User from "../models/users/user.model.js";

import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as TwitterStrategy } from "passport-twitter";
import { appEnvConfigs } from "../configs/env_config.js";
import { createDefaultSettings } from "../services/settings.service.js";

const generateRandomPassword = () =>
  crypto.randomBytes(32).toString("base64url");

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: appEnvConfigs.GOOGLE_CLIENT_ID,
      clientSecret: appEnvConfigs.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/v1/auth/google/callback",
      profileFields: ["id", "emails", "name", "photos"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email =
          profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        if (!email) {
          return done(new Error("No email found in Google profile"), null);
        }

        const name = profile.displayName;
        const picture =
          profile.photos && profile.photos[0] ? profile.photos[0].value : null;

        let user = await User.findOne({ email });

        if (!user) {
          const username = await User.generateUsername(email.split("@")[0]); // Move this line here
          user = new User({
            name,
            email,
            profilePhoto: picture,
            googleId: profile.id,
            username: username, // Use the generated username
            password: generateRandomPassword(), // Generate random password
          });
          await user.save();
          await createDefaultSettings(user._id);
        } else if (!user.googleId) {
          // Link Google account to existing user
          user.googleId = profile.id;
          if (!user.profilePhoto && picture) {
            user.profilePhoto = picture;
          }
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Facebook Strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: appEnvConfigs.FACEBOOK_CLIENT_ID,
      clientSecret: appEnvConfigs.FACEBOOK_CLIENT_SECRET,
      callbackURL: "/api/v1/auth/fbauth/callback",
      profileFields: ["id", "emails", "name", "picture.type(large)"],
      enableProof: true, // Recommended for security
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email =
          profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        if (!email) {
          return done(new Error("No email found in Facebook profile"), null);
        }

        const name = profile.displayName;
        const picture =
          profile.photos && profile.photos[0] ? profile.photos[0].value : null;

        let user = await User.findOne({ email });

        if (!user) {
          const username = await User.generateUsername(email.split("@")[0]); // Move this line here
          user = new User({
            name,
            email,
            profilePhoto: picture,
            facebookId: profile.id,
            username: username, // Use the generated username
            password: generateRandomPassword(), // Generate random password
          });
          await user.save();
          await createDefaultSettings(user._id);
        } else if (!user.facebookId) {
          // Link Facebook account to existing user
          user.facebookId = profile.id;
          if (!user.profilePhoto && picture) {
            user.profilePhoto = picture;
          }
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Twitter Strategy
passport.use(
  new TwitterStrategy(
    {
      consumerKey: appEnvConfigs.TWITTER_CONSUMER_KEY,
      consumerSecret: appEnvConfigs.TWITTER_CONSUMER_SECRET,
      callbackURL: "/api/v1/auth/xauth/callback",
      includeEmail: true, // Request email if possible
    },
    async (token, tokenSecret, profile, done) => {
      try {
        // Try to get email from Twitter if available
        const email =
          profile.emails && profile.emails[0]
            ? profile.emails[0].value
            : `${profile.username}@twitter.placeholder`; // Use a placeholder domain

        const name = profile.displayName;
        const picture =
          profile.photos && profile.photos[0] ? profile.photos[0].value : null;

        // First try to find by Twitter ID
        let user = await User.findOne({ twitterId: profile.id });

        if (!user) {
          // Then try by email
          user = await User.findOne({ email });

          if (!user) {
            // Create new user
            const username = await User.generateUsername(
              profile.username || email.split("@")[0]
            ); // Move this line here
            user = new User({
              name,
              email,
              profilePhoto: picture,
              twitterId: profile.id,
              username: username, // Use the generated username
              password: generateRandomPassword(), // Generate random password
            });
            await user.save();
            await createDefaultSettings(user._id);
          } else {
            // Link Twitter account to existing user
            user.twitterId = profile.id;
            if (!user.profilePhoto && picture) {
              user.profilePhoto = picture;
            }
            await user.save();
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Export configured passport
export default passport;
