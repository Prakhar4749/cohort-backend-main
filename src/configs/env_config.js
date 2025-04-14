import { config } from "dotenv";
config();

export const appEnvConfigs = {
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  REACT_FRONTEND_APP_URL: process.env.REACT_FRONTEND_APP_URL,
  ZOOM_API_KEY: process.env.ZOOM_API_KEY,
  ZOOM_API_SECRET: process.env.ZOOM_API_SECRET,
};
