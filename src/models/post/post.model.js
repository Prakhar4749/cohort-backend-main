import mongoose from "mongoose";

const PostSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      validate: {
        validator: (v) => typeof v === "string" && v.trim().length > 15,
        message: "Content should be more than 15 characters long.",
      },
    },
    images: {
      type: [String],
      default: [], // Ensure `images` is always an array
      validate: {
        validator: function (images) {
          return images.length <= 3;
        },
        message: "You can upload a maximum of 3 images.",
      },
    },
    pinnedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
    ],
    isEdited: { type: Boolean, default: false, index: true },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      index: true,
    },
    postType: {
      type: String,
      enum: ["text", "poll"],
      default: "text",
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    editedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

PostSchema.index({ content: "text" });

PostSchema.pre("save", function (next) {
  if (this.isModified("content") || this.isModified("images")) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  this.pinnedBy = [...new Set(this.pinnedBy.map((id) => id.toString()))];
  next();
});

PostSchema.virtual("engagementScore").get(function () {
  return this.likeCount + this.commentCount + this.viewsCount + this.shareCount;
});

const Post = mongoose.model("Post", PostSchema);
export default Post;
