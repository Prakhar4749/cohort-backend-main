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
import { Membership } from "../models/community/membership.model.js";

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

  // ✅ GET ALL POSTS of community with pagination
  static GetAllPosts = AsyncHandler(async (req, res) => {
    const { communityid } = req.params;

    // Get pagination parameters with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const community = await PostController.#findCommunity(communityid);
    if (!community) throw new ApiError(404, "Community not found");

    // Get posts with pagination
    const allPosts = await Post.find({
      community: community._id,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination info
    const total = await Post.countDocuments({ community: community._id });
    const totalPages = Math.ceil(total / limit);

    res.json(new ApiResponse(200, "All posts fetched successfully", {
      posts: allPosts,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }));
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

    // Find post first to validate it exists
    const existingPost = await PostController.#findPostById(postid);
    if (!existingPost) throw new ApiError(404, "Post not found");

    // Use the static method from your Comment model to get comments with replies
    const comments = await Comment.getPostComments(postid);

    res.json(
      new ApiResponse(200, "All comments fetched successfully", comments)
    );
  });

  // ✅ GET A SINGLE COMMENT WITH PAGINATED REPLIES
  static GetCommentWithReplies = AsyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { page = 1, limit = 10 } = req.query; // Default page 1, 10 replies per page

    // Find the comment
    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError(404, "Comment not found");

    // Find replies separately with pagination
    const replies = await Comment.find({ parentComment: commentId })
      .sort({ createdAt: -1 }) // Newest first; adjust if you want oldest first
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Get total replies count (for frontend to know how many pages)
    const totalReplies = await Comment.countDocuments({ parentComment: commentId });

    res.json(
      new ApiResponse(200, "Comment with replies fetched successfully", {
        comment,
        replies,
        pagination: {
          totalReplies,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(totalReplies / limit),
        },
      })
    );
  });


  // ✅ GET PAGINATED COMMENTS FOR A POST
  static GetPaginatedComments = AsyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Find post first to validate it exists
    const existingPost = await PostController.#findPostById(postId);
    if (!existingPost) throw new ApiError(404, "Post not found");

    // Convert query params to numbers
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Query for top-level comments only
    const query = {
      post: postId,
      parentComment: null
    };

    // Get total count for pagination
    const totalComments = await Comment.countDocuments(query);

    // Get paginated top-level comments with their replies
    const comments = await Comment.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate("user", "username profileImage")
      .populate({
        path: "replies",
        options: { sort: { createdAt: 1 } },
        populate: {
          path: "user",
          select: "username profileImage"
        }
      });

    res.json(
      new ApiResponse(200, "Comments fetched successfully", {
        comments,
        pagination: {
          totalComments,
          totalPages: Math.ceil(totalComments / limitNum),
          currentPage: pageNum,
          hasNextPage: pageNum < Math.ceil(totalComments / limitNum),
          hasPrevPage: pageNum > 1
        }
      })
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

  // ✅ Get trending for a perticular community 
  static GetTrendingPostsByCommunity = AsyncHandler(async (req, res) => {
    // Get the community ID from the request parameters or query
    const { communityid } = req.params || req.query;

    // Get pagination parameters with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Validate if communityId is provided
    if (!communityid) {
      return res.status(400).json({
        success: false,
        message: "Community ID is required"
      });
    }

    // Add a match stage to filter by community
    const trendingPosts = await Post.aggregate([
      // First match posts from the specified community
      {
        $match: {
          community: new mongoose.Types.ObjectId(communityid)
        }
      },
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
      { $skip: skip },
      { $limit: limit },
    ]);

    // Get total count for pagination info
    const totalCount = await Post.aggregate([
      {
        $match: {
          community: new mongoose.Types.ObjectId(communityid)
        }
      },
      { $count: "total" }
    ]);

    const total = totalCount.length > 0 ? totalCount[0].total : 0;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      trendingPosts,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  });



  // ✅ GET TRENDING POST WITH PAGINATION
  static GetTrendingPosts = AsyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query; // Default: page 1, 10 posts per page
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const trendingPosts = await Post.aggregate([
      // 1. Join with Community collection
      {
        $lookup: {
          from: "communities",
          localField: "community",
          foreignField: "_id",
          as: "communityDetails"
        }
      },
      // 2. Unwind the joined array
      {
        $unwind: "$communityDetails"
      },
      // 3. Filter public and free communities
      {
        $match: {
          "communityDetails.type": "Public",
          "communityDetails.membershipType": "Free"
        }
      },
      // 4. Calculate age in hours
      {
        $addFields: {
          ageInHours: {
            $divide: [{ $subtract: ["$$NOW", "$createdAt"] }, 3600000],
          },
        },
      },
      // 5. Calculate trending score
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
              { $add: [1, "$ageInHours"] },
            ],
          },
        },
      },
      // 6. Sort by trending score
      { $sort: { trendingScore: -1 } },
      // 7. Pagination
      { $skip: skip },
      { $limit: parseInt(limit) },
      // 8. Project (remove unwanted fields)
      {
        $project: {
          communityDetails: 0, // hide community details if not needed
        }
      }
    ]);

    res.status(200).json({
      success: true,
      page: parseInt(page),
      limit: parseInt(limit),
      trendingPosts
    });
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

    // Find communities where the user has active membership
    const userMemberships = await Membership.find({
      userId: userId,
      status: 'active'
    }).select('communityId');

    const userCommunityIds = userMemberships.map(membership => membership.communityId);

    // Find users with similar preferences - helps identify whose activity to prioritize
    const usersWithSimilarPreferences = await User.find({
      _id: { $ne: userId }, // Not the current user
      interests: { $in: userPreferences }, // Has at least one matching preference
    }).select("_id");

    const similarUserIds = usersWithSimilarPreferences.map((user) => user._id);

    // Get posts engaged by users with similar preferences
    const engagedPostsData = await Post.aggregate([
      // Stage 1: Join with Community collection to get community details
      {
        $lookup: {
          from: "communities",
          localField: "community",
          foreignField: "_id",
          as: "communityDetails"
        }
      },
      // Stage 2: Unwind the community details array
      {
        $unwind: "$communityDetails"
      },
      // Stage 3: Filter posts based on community access criteria
      {
        $match: {
          $or: [
            // Public and free communities
            {
              "communityDetails.type": "Public",
              "communityDetails.membershipType": "Free"
            },
            // Communities where user has active membership
            {
              "communityDetails._id": { $in: userCommunityIds }
            }
          ]
        }
      },
      // Stage 4: Calculate interest overlap between user and community - WITH NULL HANDLING
      {
        $addFields: {
          // Handle null or undefined interests with coalesce
          communityInterests: {
            $cond: {
              if: { $isArray: "$communityDetails.interests" },
              then: "$communityDetails.interests",
              else: []
            }
          }
        }
      },
      {
        $addFields: {
          interestOverlap: {
            $size: {
              $setIntersection: ["$communityInterests", userPreferences]
            }
          }
        }
      },
      // Stage 5: Look up engagement data
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "postId",
          as: "likes",
        }
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "postId",
          as: "comments",
        }
      },
      {
        $lookup: {
          from: "shares",
          localField: "_id",
          foreignField: "postId",
          as: "shares",
        }
      },
      // Stage 6: Add fields for calculations - WITH NULL HANDLING
      {
        $addFields: {
          // Handle null arrays
          likesArr: { $ifNull: ["$likes", []] },
          commentsArr: { $ifNull: ["$comments", []] },
          sharesArr: { $ifNull: ["$shares", []] },
          viewsCount: { $ifNull: ["$viewsCount", 0] }
        }
      },
      {
        $addFields: {
          // Check if any users with similar preferences engaged with this post
          similarUserEngagement: {
            $sum: [
              {
                $size: {
                  $filter: {
                    input: "$likesArr",
                    as: "like",
                    cond: { $in: ["$$like.userId", similarUserIds] },
                  }
                }
              },
              {
                $size: {
                  $filter: {
                    input: "$commentsArr",
                    as: "comment",
                    cond: { $in: ["$$comment.userId", similarUserIds] },
                  }
                }
              },
              {
                $size: {
                  $filter: {
                    input: "$sharesArr",
                    as: "share",
                    cond: { $in: ["$$share.userId", similarUserIds] },
                  }
                }
              }
            ]
          },
          // Standard engagement metrics
          likeCount: { $size: "$likesArr" },
          commentCount: { $size: "$commentsArr" },
          shareCount: { $size: "$sharesArr" },
          // Calculate age in hours (for time decay)
          ageInHours: {
            $divide: [{ $subtract: ["$$NOW", "$createdAt"] }, 3600000]
          },
          // Extract community name and other fields
          communityName: "$communityDetails.communityName",
          communityType: "$communityDetails.type",
          communityMembershipType: "$communityDetails.membershipType"
        }
      },
      // Stage 7: Calculate trending score with all factors
      {
        $addFields: {
          // Combined score including all factors
          trendingScore: {
            $divide: [
              {
                $add: [
                  // Basic engagement metrics
                  { $multiply: ["$likeCount", 2] },
                  { $multiply: ["$commentCount", 3] },
                  { $multiply: ["$viewsCount", 1] },
                  { $multiply: ["$shareCount", 4] },
                  // Similar user engagement boost
                  { $multiply: ["$similarUserEngagement", 5] },
                  // Interest overlap boost (x3 per matching interest)
                  { $multiply: ["$interestOverlap", 3] }
                ]
              },
              {
                $add: [1, "$ageInHours"] // Prevent division by zero and create time decay
              }
            ]
          }
        }
      },
      // Stage 8: Sort by trending score
      { $sort: { trendingScore: -1 } },
      // Stage 9: Apply pagination
      { $skip: skip },
      { $limit: limit },
      // Stage 10: Project to clean up response
      {
        $project: {
          _id: 1,
          content: 1,
          images: 1,
          user: 1,
          community: 1,
          postType: 1,
          likeCount: 1,
          commentCount: 1,
          shareCount: 1,
          viewsCount: 1,
          createdAt: 1,
          trendingScore: 1,
          interestOverlap: 1,
          communityName: 1,
          communityType: 1,
          communityMembershipType: 1
        }
      }
    ]);

    // Get total count for pagination info
    const totalPostsQuery = await Post.aggregate([
      // Join with Community collection
      {
        $lookup: {
          from: "communities",
          localField: "community",
          foreignField: "_id",
          as: "communityDetails"
        }
      },
      // Unwind the community details array
      {
        $unwind: "$communityDetails"
      },
      // Filter based on community access criteria
      {
        $match: {
          $or: [
            // Public and free communities
            {
              "communityDetails.type": "Public",
              "communityDetails.membershipType": "Free"
            },
            // Communities where user has active membership
            {
              "communityDetails._id": { $in: userCommunityIds }
            }
          ]
        }
      },
      // Count the documents
      {
        $count: "total"
      }
    ]);

    const totalPosts = totalPostsQuery.length > 0 ? totalPostsQuery[0].total : 0;

    res.status(200).json({
      success: true,
      posts: engagedPostsData,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
        hasNextPage: page * limit < totalPosts,
        hasPrevPage: page > 1,
      }
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
