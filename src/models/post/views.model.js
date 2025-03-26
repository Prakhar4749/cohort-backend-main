import mongoose from "mongoose";

const viewsSchema = new mongoose.Schema({
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
  viewedAt: { type: Date, default: Date.now },
});

const Views = mongoose.model("Views", viewsSchema);

export default Views;
