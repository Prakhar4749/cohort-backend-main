import mongoose from "mongoose";

const LikeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Like = mongoose.model("Like", LikeSchema);

export default Like;
