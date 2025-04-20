import cors from "cors";
import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import passport from "passport";
import { ApiError } from "./utils/responseUtils.js";
import authRoutes from "./routes/authRoutes.js";
import CommunityRouter from "./routes/community.routes.js";
import CourseRouter from "./routes/course.routes.js";
import settingsRoutes from "./routes/user.routes.js";
import supportRoutes from "./routes/support.routes.js";
import { appEnvConfigs } from "./configs/env_config.js";
import postRouter from "./routes/post.routes.js";
import { seedFAQs } from "./utils/dbSeeder.js";

import { authMiddleware } from "./middleware/auth.middleware.js";

// CONFIGS
export const app = express();

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Place CORS middleware before other middleware

// ✅ Allow all origins temporarily
app.use(cors());

/*
// 🔒 Previous restricted CORS setup — commented out for now
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "https://cohorts.com",
        "http://localhost:4200",
        "http://localhost:3000",
        "http://localhost:5173", // Vite's default port
        appEnvConfigs.REACT_FRONTEND_APP_URL,
        // Add your Vercel frontend deployment URL
        "https://cohort-backend-main-kxzy2tv0c-prakhar-sakhares-projects.vercel.app",  // Matches any Vercel app subdomain
      ];

      if (!origin || allowedOrigins.some(allowed => 
        allowed instanceof RegExp 
          ? allowed.test(origin) 
          : allowed === origin
      )) {
        callback(null, true);
      } else {
        console.log("Blocked by CORS. Origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["X-Custom-Header"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);
*/
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("common"));

// Initialize Passport
app.use(passport.initialize());

// ROUTES
const v1Router = express.Router();

// Public (no auth)
v1Router.use(authRoutes);

// Protected
v1Router.use(authMiddleware); // All below will need token
// v1Router.use(postRoutes);
// v1Router.use(communityRoutes);
// v1Router.use(courseRoutes);
v1Router.use(settingsRoutes);
v1Router.use(supportRoutes);

app.use("/api/v1", v1Router);

// app.use("/api/v1", authRoutes);
// app.use("/api/v1", postRouter);
// app.use("/api/v1", CommunityRouter);
// app.use("/api/v1", CourseRouter);
// app.use("/api/v1", settingsRoutes);
// app.use("/api/v1", supportRoutes);

// GLOBAL ERROR HANDLER
app.use((err, _req, res, _next) => {
  // Handle custom ApiError
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      status: err.status ?? "error",
      message: err.message,
      errors: err.errors ?? [],
    });
  }

  // Handle other (unexpected) errors
  console.error("[Unhandled Error]", err);
  return res.status(500).json({
    status: "error",
    message: "Internal Server Error",
  });
});
