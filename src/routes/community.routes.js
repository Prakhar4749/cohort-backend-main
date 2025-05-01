import { Router } from "express";

import { upload } from "../middleware/file-upload.middleware.js";
import { CommunityController } from "../controller/community.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { ApiError } from "../utils/responseUtils.js";
import multer from "multer";

const CommunityRouter = Router();
CommunityRouter.use(authMiddleware);

// CREATE COMMUNITY
CommunityRouter.route("/communities/create").post((req, res, next) => {
  if (req.is("multipart/form-data")) {
    upload.fields([
      { name: "communityProfileImage", maxCount: 1 },
      { name: "communityCoverImages", maxCount: 5 },
    ])(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // Handle specific multer errors
        switch (err.code) {
          case "LIMIT_UNEXPECTED_FILE":
            return next(
              new ApiError(
                400,
                `Unexpected field '${err.field}' or too many files uploaded`
              )
            );
          case "LIMIT_FILE_COUNT":
            return next(
              new ApiError(400, `Too many files for field '${err.field}'`)
            );
          case "LIMIT_FILE_SIZE":
            return next(
              new ApiError(400, `File too large for field '${err.field}'`)
            );
          default:
            return next(new ApiError(400, err.message));
        }
      } else if (err) {
        // Handle any other error
        return next(new ApiError(400, err.message));
      }

      const files = req.files;

      const profileImage = files?.communityProfileImage?.[0];
      const coverImages = files?.communityCoverImages;

      if (!profileImage) {
        return next(new ApiError(400, "communityProfileImage is required"));
      }

      if (profileImage.length > 1) {
        return next(
          new ApiError(400, "communityProfileImage can only have 1 file")
        );
      }
      if (
        profileImage.mimetype !== "image/jpeg" &&
        profileImage.mimetype !== "image/png"
      ) {
        return next(
          new ApiError(400, "communityProfileImage must be a JPEG or PNG file")
        );
      }
      if (profileImage.size > 5 * 1024 * 1024) {
        return next(
          new ApiError(400, "communityProfileImage size exceeds 5MB limit")
        );
      }

      if (!coverImages || coverImages.length === 0) {
        return next(
          new ApiError(
            400,
            "At least one communityCoverImages file is required"
          )
        );
      }
      if (coverImages && coverImages.length > 5) {
        return next(
          new ApiError(400, "communityCoverImages can only have 5 files")
        );
      }

      if (coverImages) {
        for (const image of coverImages) {
          if (image.size > 5 * 1024 * 1024) {
            return next(
              new ApiError(400, "communityCoverImages size exceeds 5MB limit")
            );
          }
          if (
            image.mimetype !== "image/jpeg" &&
            image.mimetype !== "image/png"
          ) {
            return next(
              new ApiError(
                400,
                "communityCoverImages must be a JPEG or PNG file"
              )
            );
          }
        }
      }

      next();
    });
  } else {
    next(); // If not multipart, proceed
  }
}, CommunityController.CreateCommunity);

// JOIN COMMUNITY
CommunityRouter.route("/communities/:communityId/join").post(
  CommunityController.JoinCommunity
);

// all COMMUNITY as admin
CommunityRouter.route("/communities/admin").get(
  CommunityController.getCommunitiesAsAdmin
);

// get specific COMMUNITY details as admin
CommunityRouter.route("/communities/admin/:communityId").get(
  CommunityController.getSpecificCommunityAsAdmin
);

// get suggested community for user
CommunityRouter.route("/communities/suggestion").get(
  CommunityController.GetSuggestedCommunities
);

// update specific COMMUNITY details as admin
CommunityRouter.route("/communities/admin/:communityId").put(
  (req, res, next) => {
    // Only apply multer middleware for multipart/form-data requests
    if (req.is("multipart/form-data")) {
      upload.fields([
        { name: "communityProfileImage", maxCount: 1 },
        { name: "communityCoverImages", maxCount: 10 },
      ])(req, res, (err) => {
        if (err) {
          return next(err);
        }
        next();
      });
    } else {
      // If not multipart, just proceed to the controller
      next();
    }
  },
  CommunityController.updateSpecificCommunityAsAdmin
);

// delete COMMUNITY as owner
CommunityRouter.route("/communities/admin/:communityId").delete(
  CommunityController.deleteCommunityAsOwner
);

// Payment routes

CommunityRouter.route("/communities/paymentMethod/:communityId").get(
  CommunityController.getCommunityPaymentMethod
);

CommunityRouter.route("/communities/paymentMethod/:communityId").post(
  CommunityController.addCommunityPaymentMethod
);

CommunityRouter.route(
  "/communities/paymentMethod/:communityId/update/:payment_method_id"
).put(CommunityController.updateCommunityPaymentMethod);

CommunityRouter.route(
  "/communities/paymentMethod/:communityId/delete/:payment_method_id"
).delete(CommunityController.deleteCommunityPaymentMethod);

// transaction
CommunityRouter.route("/communities/transaction/:communityId").get(
  CommunityController.getCommunityTransaction
);
// permissions
CommunityRouter.route("/communities/permission/:communityId").get(
  CommunityController.getCommunityPermissions
);

CommunityRouter.route("/communities/permission/:communityId").put(
  CommunityController.updateCommunityPermissions
);

// COMMUNITY STATS
CommunityRouter.route("/communities/:communityid/stats").get(
  CommunityController.GetCommunityStats
);

// TRENDING COMMUNITY
CommunityRouter.route("/communities/trending").get(
  CommunityController.TrendingCommunity
);

// TRENDING POSTS
CommunityRouter.route("/communities/trending-posts").get(
  CommunityController.GetTrendingPosts
);
// MOST ACTIVE USERS
CommunityRouter.route("/communities/most-active-users").get(
  CommunityController.GetMostActiveUsers
);
// GenerateVideoCallUrl
// CommunityRouter.route("/zoom/callback").post(
//   CommunityController.GenerateVideoCallUrl
// );
export default CommunityRouter;
