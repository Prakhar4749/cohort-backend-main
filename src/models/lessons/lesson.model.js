import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema({
  lessonName: {
    type: String,
    required: true,
    index: true,
  },
  lessonDescription: {
    type: String,
    required: true,
    index: true,
  },
  lessonMediaType: {
    type: String,
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
    index: true,
  },
  isPublished: {
    type: Boolean,
    default: false,
    index: true,
  },
});

const Lesson = mongoose.model("Lesson", lessonSchema);

export default Lesson;
