import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { PostController } from "../controller/post.controller.js";
import { upload } from "../middleware/file-upload.middleware.js";

const PostRouter = Router();
PostRouter.use(authMiddleware);

// ✅ Post Routes
PostRouter.route("/posts/:userid/community/:communityid").post(
  upload.array("postImgs", 3),
  PostController.CreatePost
);

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

// ✅ Share Routes (Nested under /posts/:id/shares)
PostRouter.route("/posts/:postid/shares/:userid").post(
  PostController.SharePost
);

// PIN POST
PostRouter.route("/posts/:postid/pin/:userid").post(
  PostController.TogglePinPost
);

// ✅ Trending Post Routes
PostRouter.route("/posts/trending").get(PostController.GetTrendingPosts);

// ✅ Polling Post Routes
PostRouter.route("/communities/:id/poll").post(PostController.CreatePoll);
PostRouter.route("/communities/:pollid/poll").patch(PostController.VoteOnPoll);

export default PostRouter;
