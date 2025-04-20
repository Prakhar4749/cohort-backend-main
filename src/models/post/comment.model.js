// import mongoose from "mongoose";

// const commentSchema = new mongoose.Schema(
//   {
//     post: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Post",
//       required: true,
//       index: true,
//     },
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       index: true,
//     },
//     content: {
//       type: String,
//       required: true,
//       validate: {
//         validator: (v) => v.length > 10,
//         message: "Comment should be more than 10 characters long.",
//       },
//     },
//     createdAt: { type: Date, default: Date.now },
//     editedAt: { type: Date },
//   },
//   { timestamps: true }
// );

// const Comment = mongoose.model("Comment", commentSchema);
// export default Comment;


import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      validate: {
        validator: (v) => v.length > 10,
        message: "Comment should be more than 10 characters long.",
      },
    },
    // Field to track if this is a reply to another comment
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },
    // Track all replies to this comment
    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    // Optional - track the nesting level (for limiting depth if needed)
    level: {
      type: Number,
      default: 0,
    },
    createdAt: { type: Date, default: Date.now },
    editedAt: { type: Date },
  },
  { timestamps: true }
);

// Add an index for faster querying of top-level comments
commentSchema.index({ post: 1, parentComment: 1 });

// Pre-save middleware to set the level based on parent
commentSchema.pre("save", async function (next) {
  if (this.parentComment) {
    try {
      const parentComment = await this.constructor.findById(this.parentComment);
      if (parentComment) {
        this.level = parentComment.level + 1;
        // Add this comment to parent's replies array
        await this.constructor.findByIdAndUpdate(
          this.parentComment,
          { $push: { replies: this._id } }
        );
      }
    } catch (error) {
      next(error);
    }
  }
  next();
});

// Method to fetch a comment with all its replies populated
commentSchema.statics.findWithReplies = async function (commentId) {
  return this.findById(commentId)
    .populate({
      path: "replies",
      populate: {
        path: "user",
        select: "username profileImage"
      }
    })
    .populate("user", "username profileImage");
};

// Method to get all top-level comments for a post with their replies
commentSchema.statics.getPostComments = async function (postId) {
  return this.find({ post: postId, parentComment: null })
    .sort({ createdAt: -1 })
    .populate("user", "username profilePhoto")
    .populate({
      path: "replies",
      options: { sort: { createdAt: 1 } },
      populate: {
        path: "user",
        select: "username profilePhoto"
      }
    });
};

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;