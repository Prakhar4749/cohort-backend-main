import express from "express";
// import jwt from "jsonwebtoken";

// import passport from "../configs/passport.js";
import {
  // oauthLogin,
  signup,
  login,
} from "../controller/userController.js";

// import { successResponse } from "../utils/responseUtils.js";

const authRoutes = express.Router();

// Standard login and signup routes
authRoutes.route("/auth/login").post(login);
authRoutes.route("/auth/signup").post(signup);

// // OAuth callback handlers
// // Google callback
// authRoutes
//   .route("/auth/google/callback")
//   .get(
//     passport.authenticate("google", { failureRedirect: "/login" }),
//     (req, res) => {
//       const user = req.user;
//       const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//         expiresIn: "7d",
//       });
//       successResponse(res, { token, user }, "Google authentication successful");
//     }
//   );

// // Facebook callback
// authRoutes
//   .route("/auth/fbauth/callback")
//   .get(
//     passport.authenticate("facebook", { failureRedirect: "/login" }),
//     (req, res) => {
//       const user = req.user;
//       const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//         expiresIn: "7d",
//       });
//       successResponse(
//         res,
//         { token, user },
//         "Facebook authentication successful"
//       );
//     }
//   );

// // Twitter/X callback
// authRoutes
//   .route("/auth/xauth/callback")
//   .get(
//     passport.authenticate("twitter", { failureRedirect: "/login" }),
//     (req, res) => {
//       const user = req.user;
//       const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//         expiresIn: "7d",
//       });
//       successResponse(
//         res,
//         { token, user },
//         "Twitter authentication successful"
//       );
//     }
//   );

export default authRoutes;
