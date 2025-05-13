import multer from "multer";

export const upload = multer({
  storage: multer.memoryStorage(), // stores files in memory
  limits: { fileSize: 5 * 1024 * 1024 },
});
