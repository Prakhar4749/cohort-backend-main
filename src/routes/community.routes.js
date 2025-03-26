import { Router } from "express";

import { upload } from "../middleware/file-upload.middleware.js";
import { CommunityController } from "../controller/community.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const CommunityRouter = Router();
CommunityRouter.use(authMiddleware);

// CREATE COMMUNITY
CommunityRouter.route("/communities/create").post( 
  (req, res, next) => {
    // Only apply multer middleware for multipart/form-data requests
    if (req.is('multipart/form-data')) {
      upload.fields([
        { name: 'communityProfileImage', maxCount: 1 },
        { name: 'communityCoverImages', maxCount: 10 }
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
  CommunityController.CreateCommunity
);

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

// update specific COMMUNITY details as admin
CommunityRouter.route("/communities/admin/:communityId").put((req, res, next) => {
  // Only apply multer middleware for multipart/form-data requests
  if (req.is('multipart/form-data')) {
    upload.fields([
      { name: 'communityProfileImage', maxCount: 1 },
      { name: 'communityCoverImages', maxCount: 10 }
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

CommunityRouter.route("/communities/paymentMethod/:communityId/update/:payment_method_id").put(
  CommunityController.updateCommunityPaymentMethod
);

CommunityRouter.route("/communities/paymentMethod/:communityId/delete/:payment_method_id").delete(
  CommunityController.deleteCommunityPaymentMethod
);

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
