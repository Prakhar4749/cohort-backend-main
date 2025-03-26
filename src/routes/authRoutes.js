import express from "express";

import { oauthLogin, signup } from "../controller/user.controller.js";
import { login } from "../controller/user.controller.js";

const authRoutes = express.Router();

// Route for Google authentication
authRoutes.route("/auth/googleauth").post(oauthLogin);
authRoutes.route("/auth/fbauth").post(oauthLogin);
authRoutes.route("/auth/xauth").post(oauthLogin);

authRoutes.route("/auth/login").post(login);
authRoutes.route("/auth/signup").post(signup);
export default authRoutes;
