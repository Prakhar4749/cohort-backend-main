import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { PostController } from "../controller/post.controller.js";
import { upload } from "../middleware/file-upload.middleware.js";
import { ApiError } from "../utils/responseUtils.js";
import multer from "multer";

const PostRouter = Router();
PostRouter.use(authMiddleware);

// ✅ Trending Post Routes
PostRouter.route("/posts/trending").get(PostController.GetTrendingPosts);

// ✅  PERSONLISED Trending Post Routes
PostRouter.route("/posts/user/trending").get(
  PostController.GetPersonalizedTrendingPosts
);

// ✅ community Trending Post Routes
PostRouter.route("/posts/user/trending/:communityid").get(
  PostController.GetTrendingPostsByCommunity
);

// ✅ Post Routes
PostRouter.route("/posts/community/:communityid").post((req, res, next) => {
  if (req.is("multipart/form-data")) {
    upload.array("postImgs", 10)(req, res, (err) => {
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
              new ApiError(400, "You can upload a maximum of 3 images")
            );
          case "LIMIT_FILE_SIZE":
            return next(
              new ApiError(400, `File too large (maximum size: 5MB)`)
            );
          default:
            return next(new ApiError(400, err.message));
        }
      } else if (err) {
        // Handle any other error
        return next(new ApiError(400, err.message));
      }

      const files = req.files || [];

      // Validate file types and sizes
      for (const file of files) {
        // Check file type
        if (
          file.mimetype !== "image/jpeg" &&
          file.mimetype !== "image/png" &&
          file.mimetype !== "image/gif" &&
          file.mimetype !== "image/webp"
        ) {
          return next(
            new ApiError(
              400,
              "Post images must be JPEG, PNG, GIF or WEBP files"
            )
          );
        }

        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          return next(new ApiError(400, "Image size exceeds 5MB limit"));
        }
      }

      // Validation successful, proceed to controller
      next();
    });
  } else {
    // If not multipart/form-data, just proceed (for text-only posts)
    next();
  }
}, PostController.CreatePost);

PostRouter.route("/posts/community/:communityid").get(
  PostController.GetAllPosts
);

// ✅ Like Routes (Nested under /posts/:postid/likes/:userid)
PostRouter.route("/posts/:postid/likes/:userid").post(
  PostController.ToggleLikePost
);

// GetPostStats
PostRouter.route("/posts/:postid").get(PostController.GetPostStats);

// ✅ Comment Routes (Nested under /posts/:id/comments)
PostRouter.route("/posts/:postid/comments/:userid").post(
  PostController.CreateComment
);

PostRouter.route("/posts/:postid/comments").get(PostController.GetPostComments);

PostRouter.route("/comments/:commentId").get(
  PostController.GetCommentWithReplies
);

PostRouter.route("/posts/:postId/comments/paginated").get(
  PostController.GetPaginatedComments
);

// ✅ Share Routes (Nested under /posts/:id/shares)
PostRouter.route("/posts/:postid/shares/:userid").post(
  PostController.SharePost
);

// PIN POST
PostRouter.route("/posts/:postid/pin/:userid").post(
  PostController.TogglePinPost
);

// ✅ Polling Post Routes
PostRouter.route("/communities/:id/poll").post(PostController.CreatePoll);
PostRouter.route("/communities/:pollid/poll").patch(PostController.VoteOnPoll);

export default PostRouter;
