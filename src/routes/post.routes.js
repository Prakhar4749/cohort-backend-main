import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { PostController } from "../controller/post.controller.js";
import { upload } from "../middleware/file-upload.middleware.js";

const PostRouter = Router();
PostRouter.use(authMiddleware);


// ✅ Trending Post Routes
PostRouter.route("/posts/trending").get(PostController.GetTrendingPosts);

// ✅  PERSONLISED Trending Post Routes
PostRouter.route("/posts/user/trending").get(PostController.GetPersonalizedTrendingPosts);

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

PostRouter.route('/comments/:commentId').get(PostController.GetCommentWithReplies);

PostRouter.route('/posts/:postId/comments/paginated').get(PostController.GetPaginatedComments);



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
