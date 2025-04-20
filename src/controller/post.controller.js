import { ApiError, ApiResponse, AsyncHandler } from "../utils/responseUtils.js";
import { GetImageUrlFromCloudinary } from "../libs/cloudinary/cloudinaryUploader.js";
import Post from "../models/post/post.model.js";
import Comment from "../models/post/comment.model.js";
import Like from "../models/post/like.model.js";
import Share from "../models/post/share.model.js";
import Community from "../models/community/community.model.js";
import Poll from "../models/post/poll.model.js";
import User from "../models/users/user.model.js";
import { appEnvConfigs } from "../configs/env_config.js";
import pollSchema from "../schema/pollSchema.js";
import mongoose from "mongoose";

export class PostController {
  // 🔒 Private method to find a post by ID
  static async #findPostById(postid) {
    return await Post.findById(postid);
  }

  static async #findCommunity(communityId) {
    return await Community.findById(communityId);
  }

  static async #findUserById(userId) {
    return await User.findById(userId);
  }

  // SEARCH POST

  // static UserId = "67a6d128a0a744491e097cf6";

  // ✅ CREATE POST
  static CreatePost = AsyncHandler(async (req, res) => {
    // Fix for content handling
    let content;
    if (typeof req.body.content === "object") {
      content = req.body.content.content;
    } else {
      content = req.body.content;
    }

    if (!content) throw new ApiError(401, "Please provide valid content");

    const { userid: userId, communityid: communityId } = req.params;

    // Find user and community
    const [community, user] = await Promise.all([
      communityId ? PostController.#findCommunity(communityId) : null,
      PostController.#findUserById(userId),
    ]);

    if (communityId && !community)
      throw new ApiError(404, "Community not found");

    if (!user) throw new ApiError(404, "User not found");

    // Process files
    const postImgs = req.files ? req.files.map((file) => file.path) : [];
    if (postImgs.length > 3)
      throw new ApiError(400, "You can upload a maximum of 3 images.");

    const images =
      postImgs.length > 0 ? await GetImageUrlFromCloudinary(postImgs) : [];

    // Create post
    const newPost = await Post.create({
      content,
      images,
      user: userId,
      community: communityId,
    });

    // Only update community if it exists
    if (community && community.communityPosts) {
      community.communityPosts.push(newPost._id);
      await community.save();
    }

    res
      .status(201)
      .json(new ApiResponse(201, "Post created successfully", newPost));
  });

  // ✅ GET ALL POSTS of community
  static GetAllPosts = AsyncHandler(async (req, res) => {
    const { communityid } = req.params;

    const community = await PostController.#findCommunity(communityid);
    if (!community) throw new ApiError(404, "Community not found");
    const allPosts = await Post.find({
      community: community._id,
    }).sort({ createdAt: -1 });
    res.json(new ApiResponse(200, "All posts fetched successfully", allPosts));
  });

  // ✅ TOGGLE LIKE DISLIKE
  static ToggleLikePost = AsyncHandler(async (req, res) => {
    const { postid, userid } = req.params;

    const existingPost = await PostController.#findPostById(postid);
    if (!existingPost) throw new ApiError(404, "Post not found");

    const existingLike = await Like.findOne({ user: userid, post: postid });

    if (existingLike) {
      await Like.findOneAndDelete({ user: userid, post: postid });

      const updatedPost = await Post.findByIdAndUpdate(
        postid,
        { $inc: { likeCount: -1 } },
        { new: true }
      );

      return res.status(200).json(
        new ApiResponse(200, "Post unliked successfully", {
          likeCount: updatedPost.likeCount,
        })
      );
    }

    // Like the post
    await Like.create({ user: userid, post: postid });

    const updatedPost = await Post.findByIdAndUpdate(
      postid,
      { $inc: { likeCount: 1 } },
      { new: true } // Return updated document
    );

    res.status(200).json(
      new ApiResponse(200, "Post liked successfully", {
        likeCount: updatedPost.likeCount,
      })
    );
  });

  // ✅ GET TOTAL LIKE AND COMMENTS AND SHARE STATS
  static GetPostStats = AsyncHandler(async (req, res) => {
    const postId = req.params.postid;
    const existingPost = await PostController.#findPostById(postId);
    if (!existingPost) throw new ApiError(404, "Post not found");

    const postStats = await Post.findOne(
      {
        _id: postId,
      },
      { _id: 0, likeCount: 1, shareCount: 1, commentCount: 1 }
    );

    res.json(
      new ApiResponse(200, "Post stats fetched successfully", postStats)
    );
  });

  // ✅ CREATE COMMENT
  static CreateComment = AsyncHandler(async (req, res) => {
    const { postid, userid } = req.params;
    const { content } = req.body;

    if (!content) throw new ApiError(400, "Content cannot be empty");

    const [existingPost, userExist] = await Promise.all([
      PostController.#findPostById(postid),
      PostController.#findUserById(userid),
    ]);

    if (!existingPost) throw new ApiError(404, "Post not found");
    if (!userExist) throw new ApiError(404, "User not found");

    const newComment = await Comment.create({
      post: postid,
      user: userid,
      content,
    });

    await Post.findByIdAndUpdate(postid, {
      $inc: { commentCount: 1 },
    });

    res.status(201).json(
      new ApiResponse(201, "Comment created successfully", {
        _id: newComment._id,
        content: newComment.content,
        createdAt: newComment.createdAt,
        user: { _id: userExist._id, name: userExist.name }, // Return minimal user info
      })
    );
  });

  // ✅ TOGGLE PIN/UNPIN POST
  static TogglePinPost = AsyncHandler(async (req, res) => {
    const { postid, userid } = req.params;
    const post = await Post.findById(postid);

    if (!post) throw new ApiError(404, "Post not found");

    const isPinned = post.pinnedBy.includes(userid);

    if (isPinned) {
      post.pinnedBy.pull(userid);
    } else {
      post.pinnedBy.push(userid);
    }

    await post.save();

    res.status(200).json(
      new ApiResponse(
        200,
        `Post ${isPinned ? "unpinned" : "pinned"} successfully`,
        {
          _id: post._id,
          isPostPinned: !isPinned,
        }
      )
    );
  });

  // ✅ GET COMMENTS FOR A POST
  static GetPostComments = AsyncHandler(async (req, res) => {
    const { postid } = req.params;
    const existingPost = await PostController.#findPostById(postid);
    if (!existingPost) throw new ApiError(404, "Post not found");

    const allComments = await Comment.find({ post: postid })
      .sort({ createdAt: -1 })
      .populate("user", "name username email");
    res.json(
      new ApiResponse(200, "All comments fetched successfully", allComments)
    );
  });

  // ✅ GET USER POSTS
  static GetUserPosts = AsyncHandler(async (req, res) => {
    const userId = req.params.id;
    const allPosts = await Post.find({ user: userId }).sort({ createdAt: -1 });

    res.json(new ApiResponse(200, "User posts fetched successfully", allPosts));
  });

  // ✅ SHARE POST
  static SharePost = AsyncHandler(async (req, res) => {
    const { postid, userid } = req.params;

    const existingPost = await PostController.#findPostById(postid);
    if (!existingPost) throw new ApiError(404, "Post not found");

    const [sharedPost] = await Promise.all([
      Share.create({ postShared: postid, sharedBy: userid }),
      Post.findByIdAndUpdate(postid, { $inc: { shareCount: 1 } }),
    ]);

    const postLinks = `${appEnvConfigs.REACT_FRONTEND_APP_URL}/posts/${sharedPost._id}`;

    res
      .status(201)
      .json(new ApiResponse(201, "Post shared successfully", postLinks));
  });

  // ✅ GET TRENDING POST
  static GetTrendingPosts = AsyncHandler(async (req, res) => {
    // Since we're using AsyncHandler, we don't need the try-catch block
    const trendingPosts = await Post.aggregate([
      {
        $addFields: {
          ageInHours: {
            $divide: [{ $subtract: ["$$NOW", "$createdAt"] }, 3600000],
          },
        },
      },
      {
        $addFields: {
          trendingScore: {
            $divide: [
              {
                $add: [
                  { $multiply: ["$likeCount", 2] },
                  { $multiply: ["$commentCount", 3] },
                  { $multiply: ["$viewsCount", 1] },
                  { $multiply: ["$shareCount", 4] },
                ],
              },
              {
                $add: [1, "$ageInHours"], // Prevent division by zero
              },
            ],
          },
        },
      },
      { $sort: { trendingScore: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({ success: true, trendingPosts });
  });

  // ✅ GET PERSONALIZED TRENDING POSTS
  static GetPersonalizedTrendingPosts = AsyncHandler(async (req, res) => {
    const userId = req.user._id; // Assuming userId comes from authenticated user
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get current user's preferences
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      res.status(404);
      throw new Error("User not found");
    }

    // Get user preferences (filtering out empty string if it exists)
    const userPreferences = currentUser.interests.filter((pref) => pref !== "");

    // Find users with similar preferences - helps identify whose activity to prioritize
    const usersWithSimilarPreferences = await User.find({
      _id: { $ne: userId }, // Not the current user
      interests: { $in: userPreferences }, // Has at least one matching preference
    }).select("_id");

    const similarUserIds = usersWithSimilarPreferences.map((user) => user._id);

    // Get posts engaged by users with similar preferences
    const engagedPostsData = await Post.aggregate([
      // Stage 1: Match posts that were engaged by users with similar preferences
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "postId",
          as: "likes",
        },
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "postId",
          as: "comments",
        },
      },
      {
        $lookup: {
          from: "shares",
          localField: "_id",
          foreignField: "postId",
          as: "shares",
        },
      },
      // Stage 2: Add fields for calculations
      {
        $addFields: {
          // Check if any users with similar preferences engaged with this post
          similarUserEngagement: {
            $sum: [
              {
                $size: {
                  $filter: {
                    input: "$likes",
                    as: "like",
                    cond: { $in: ["$$like.userId", similarUserIds] },
                  },
                },
              },
              {
                $size: {
                  $filter: {
                    input: "$comments",
                    as: "comment",
                    cond: { $in: ["$$comment.userId", similarUserIds] },
                  },
                },
              },
              {
                $size: {
                  $filter: {
                    input: "$shares",
                    as: "share",
                    cond: { $in: ["$$share.userId", similarUserIds] },
                  },
                },
              },
            ],
          },
          // Standard engagement metrics
          likeCount: { $size: "$likes" },
          commentCount: { $size: "$comments" },
          shareCount: { $size: "$shares" },
          // Calculate age in hours
          ageInHours: {
            $divide: [{ $subtract: ["$$NOW", "$createdAt"] }, 3600000],
          },
        },
      },
      // Stage 3: Calculate trending score with preference boost
      {
        $addFields: {
          // Combined score including preference-based boost
          trendingScore: {
            $divide: [
              {
                $add: [
                  { $multiply: ["$likeCount", 2] },
                  { $multiply: ["$commentCount", 3] },
                  { $multiply: ["$viewsCount", 1] },
                  { $multiply: ["$shareCount", 4] },
                  // Boost for engagement by users with similar preferences (multiplier of 5)
                  { $multiply: ["$similarUserEngagement", 5] },
                ],
              },
              {
                $add: [1, "$ageInHours"], // Prevent division by zero
              },
            ],
          },
        },
      },
      // Stage 4: Sort by trending score
      { $sort: { trendingScore: -1 } },
      // Stage 5: Apply pagination
      { $skip: skip },
      { $limit: limit },
      // Stage 6: Project to clean up response (remove temp fields we don't need)
      {
        $project: {
          likes: 0, // Remove the likes array
          comments: 0, // Remove the comments array
          shares: 0, // Remove the shares array
        },
      },
    ]);

    // Get total count for pagination info
    const totalPosts = await Post.countDocuments();

    res.status(200).json({
      success: true,
      posts: engagedPostsData,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
        hasNextPage: page * limit < totalPosts,
        hasPrevPage: page > 1,
      },
    });
  });

  // ✅ CREATE POLLS
  static CreatePoll = AsyncHandler(async (req, res) => {
    const { id: communityId } = req.params;
    const parsedData = pollSchema.safeParse(req.body);
    if (!parsedData.success)
      throw new ApiError(
        400,
        parsedData.error.errors.map((err) => err.message).join(", ")
      );

    if (!(await PostController.#findCommunity(communityId))) {
      throw new ApiError(404, "Community not found");
    }

    const { title, question, options, expiredAt } = parsedData.data;

    const session = await mongoose.startSession();
    session.startTransaction();

    const newPost = await Post.create(
      [{ community: communityId, content: title, postType: "poll" }],
      { session }
    );
    const newPoll = await Poll.create(
      [{ question, options, expiredAt, postId: newPost[0]._id }],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res
      .status(201)
      .json(new ApiResponse(201, "Poll created successfully", newPoll[0]));
  });

  // ✅ VOTE ON POLL
  static VoteOnPoll = AsyncHandler(async (req, res) => {
    const { pollid: pollId } = req.params;
    // const userId = req.user.id;
    const { option } = req.body;
    const poll = await Poll.findById(pollId);
    if (!poll) throw new ApiError(404, "Poll not found");
    if (poll.expiredAt < new Date()) throw new ApiError(403, "Poll expired");
    if (poll.votedBy.includes(this.UserId))
      throw new ApiError(400, "User already voted");
    poll.votes?.set(option, (poll.votes.get(option) || 0) + 1);
    poll.votedBy.push(this.UserId);
    await poll.save();

    res.status(200).json(new ApiResponse(200, "Vote submitted successfully"));
  });
}
