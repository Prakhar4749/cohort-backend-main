import cors from "cors";
import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import { ApiError } from "./utils/server-utils.js";
import authRoutes from "./routes/authRoutes.js";
import CommunityRouter from "./routes/community.routes.js";
import CourseRouter from "./routes/course.routes.js";
import settingsRoutes from "./routes/user.routes.js";
import { appEnvConfigs } from "./configs/env_config.js";
import PostRouter from "./routes/post.routes.js";

// CONFIGS
export const app = express();

// MIDDLEWARES
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Place CORS middleware before other middleware
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("common"));

// ROUTES
app.use("/api/v1", authRoutes);
app.use("/api/v1", PostRouter);
app.use("/api/v1", CommunityRouter);
app.use("/api/v1", CourseRouter);
app.use("/api/v1", settingsRoutes);

// GLOBAL ERROR HANDLER
app.use((err, _req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      message: err.message,
      statusCode: err.statusCode,
      status: err.status ?? "failed",
    });
  }
  next(err);
});
