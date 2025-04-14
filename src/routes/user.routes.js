import express from "express";
import { upload } from "../middleware/file-upload.middleware.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import userSettingsController from "../controller/user.settings.controller.js";
import  UserController  from "../controller/user.controller.js";

const router = express.Router();

router.use(authMiddleware);

// Account routes

router.get("/user/account", UserController.getUserAccount);
// update preferences 
router.put("/user/preferences", UserController.updatePreferences);
// delete preferences 
router.put("/user/preferences/delete", UserController.deletePreferences);


router.get("/user/settings", userSettingsController.getUserSettings);

router.put(
  "/user/settings",
  (req, res, next) => {
    // Only apply multer middleware for multipart/form-data requests
    if (req.is("multipart/form-data")) {
      upload.fields([
        { name: "profilePhoto", maxCount: 1 },
        { name: "coverPhoto", maxCount: 1 },
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
  userSettingsController.updateUserSettings
);

// Payment routes
router.get("/user/paymentMethod", userSettingsController.getUserPaymentMethod);

router.post(
  "/user/paymentMethod/",
  userSettingsController.addUserPaymentMethod
);

router.put(
  "/user/paymentMethod/update/:payment_method_id",
  userSettingsController.updateUserPaymentMethod
);

router.delete(
  "/user/paymentMethod/delete/:payment_method_id",
  userSettingsController.deleteUserPaymentMethod
);

// done 👍

router.get("/user/transactions", userSettingsController.getUserTransaction);

// Permissions routes
router.get("/user/permissions", userSettingsController.getUserPermissions);
router.put("/user/permissions", userSettingsController.updateUserPermissions);

export default router;
