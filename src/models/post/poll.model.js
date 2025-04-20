import mongoose from "mongoose";
import { parse, format } from "date-fns";

const pollSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    index: true,
  },
  question: {
    type: String,
    required: true,
  },
  options: [String],
  votedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  votes: {
    type: Map,
    of: Number,
  },
  createdAt: { type: Date, default: Date.now },
  expiredAt: { type: Date, required: true },
});

pollSchema.pre("save", function (next) {
  if (typeof this.expiredAt === "string") {
    this.expiredAt = format(
      parse(this.expiredAt, "dd/MM/yyyy", new Date()),
      "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"
    );
  }
  next();
});

const Poll = mongoose.model("Poll", pollSchema);

export default Poll;
