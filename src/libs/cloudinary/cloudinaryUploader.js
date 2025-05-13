import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { appEnvConfigs } from "../../configs/env_config.js";

// Cloudinary config
cloudinary.config({
  cloud_name: appEnvConfigs.CLOUDINARY_CLOUD_NAME,
  api_key: appEnvConfigs.CLOUDINARY_API_KEY,
  api_secret: appEnvConfigs.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Uploads buffer files to Cloudinary using streams.
 * @param {Array} files - Multer files from memory storage
 * @param {string} folderName - Optional Cloudinary folder name
 * @returns {Promise<Array<string>>} - Array of Cloudinary URLs
 */
export const GetImageUrlFromCloudinary = async (files, folderName = "") => {
  if (!files || files.length === 0) {
    console.error("No files provided");
    return [];
  }

  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          folder: folderName || undefined, // Use folder only if provided
        },
        (error, result) => {
          if (error) {
            console.error("Upload error:", error);
            reject(error);
          } else {
            resolve(result.secure_url);
          }
        }
      );

      streamifier.createReadStream(file.buffer).pipe(stream);
    });
  });

  return await Promise.all(uploadPromises);
};
