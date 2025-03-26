// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// import dotenv from "dotenv";

// dotenv.config();

// // Initialize AWS S3 Client
// const s3 = new S3Client({
//   region: process.env.AWS_REGION!,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
//   },
// });

// // Generate Pre-Signed URL Function
// export const generatePresignedUrl = async (fileName: string, fileType: string): Promise<string> => {
//   const params = {
//     Bucket: process.env.AWS_S3_BUCKET_NAME!,
//     Key: `videos/${Date.now()}-${fileName}`, // Store in "videos/" folder with a timestamp
//     ContentType: fileType,
//     ACL: "public-read",
//   };

//   const command = new PutObjectCommand(params);
//   return getSignedUrl(s3, command, { expiresIn: 3600 }); // URL valid for 1 hour
// };
