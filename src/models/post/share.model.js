import mongoose from "mongoose";

const shareSchema = new mongoose.Schema({
  postShared: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    required: true,
    index: true,
  },
  sharedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  sharedAt: { type: Date, default: Date.now },
});

const Share = mongoose.model("Share", shareSchema);

export default Share;
