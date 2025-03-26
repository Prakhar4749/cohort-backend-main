import { ApiError, ApiResponse, AsyncHandler } from "../utils/server-utils.js";
import { GetImageUrlFromCloudinary } from "../libs/cloudinary/cloudinaryUploader.js";
import Course from "../models/lessons/course.model.js";
import UserEnrollment from "../models/lessons/user-enrollment.js";
import Lesson from "../models/lessons/lesson.model.js";
import mongoose from "mongoose";
import User from "../models/users/user.model.js";

export class CourseController {
  static async #findCourseById(courseId) {
    return Course.findById(courseId);
  }

  static async #findLessonById(lessonId) {
    return Lesson.findById(lessonId);
  }

  static async #findUserById(userId) {
    return User.findById(userId);
  }

  // ✅ CREATE COURSE
  static CreateCourse = AsyncHandler(async (req, res) => {
    const { userid } = req.params;
    if (!userid) throw new ApiError(401, "Unauthorized to create course");
    const { title, category, description } = req.body;
    if (!title || !category || !description) {
      throw new ApiError(400, "All fields are required");
    }
    const thumbnail = req.file
      ? await GetImageUrlFromCloudinary([req.file.path])
      : [];

    const newCourse = await Course.create({
      title,
      category,
      description,
      thumbnail,
      createdBy: userid,
    });
    res.json(new ApiResponse(200, "Course created successfully", newCourse));
  });

  // ✅ SEARCH COURSES
  static SearchCourses = AsyncHandler(async (req, res) => {
    const { query } = req.query;
    const courses = await Course.find({ $text: { $search: query } }).sort({
      createdAt: -1,
    });
    res.json(new ApiResponse(200, "Courses searched successfully", courses));
  });

  // ✅ GET COURSE BY ID
  static GetCourseById = AsyncHandler(async (req, res) => {
    const existingCourse = await CourseController.#findCourseById(
      req.params.courseId
    );
    if (!existingCourse) throw new ApiError(404, "Course not found");
    res.json(
      new ApiResponse(200, "Course fetched successfully", existingCourse)
    );
  });

  // ✅ GET ALL COURSES
  static GetAllCourses = AsyncHandler(async (_, res) => {
    const allCourses = await Course.find().sort({ createdAt: -1 });
    res.json(
      new ApiResponse(200, "All courses fetched successfully", allCourses)
    );
  });

  // ✅ TOGGLE ENROLLMENT FROM COURSE
  static ToggleEnrollment = AsyncHandler(async (req, res) => {
    const { courseId, userId } = req.params;
    const [existingCourse, existingUser] = await Promise.all([
      CourseController.#findCourseById(courseId),
      CourseController.#findUserById(userId),
    ]);
    if (!existingCourse || !existingUser)
      throw new ApiError(404, "User or course not found");

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const existingEnrollment = await UserEnrollment.findOne({
        user: userId,
        course: courseId,
      });

      if (existingEnrollment) {
        await UserEnrollment.deleteOne(
          { _id: existingEnrollment._id },
          { session }
        );
        await session.commitTransaction();
        res.json(new ApiResponse(200, "User unenrolled successfully"));
      } else {
        const newEnrollment = await UserEnrollment.create(
          [{ user: userId, course: courseId }],
          { session }
        );
        await session.commitTransaction();
        res.json(
          new ApiResponse(200, "User enrolled successfully", newEnrollment)
        );
      }
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  });

  // ✅ CREATE LESSON
  static CreateLesson = AsyncHandler(async (req, res) => {
    const { lessonName, lessonDescription, lessonMediaType } = req.body;
    if (!lessonName || !lessonDescription || !lessonMediaType)
      throw new ApiError(400, "All fields are required");

    const course = await CourseController.#findCourseById(req.params.courseId);
    if (!course) throw new ApiError(404, "Course not found");

    const lesson = await Lesson.create({
      lessonName,
      lessonDescription,
      lessonMediaType,
      courseId: course._id,
    });
    res.json(new ApiResponse(201, "Lesson created successfully", lesson));
  });

  // ✅ GET ALL LESSONS BY COURSE ID
  static GetAllLessonsByCourseId = AsyncHandler(async (req, res) => {
    const lessons = await Lesson.find({ courseId: req.params.courseId }).sort({
      createdAt: -1,
    });
    res.json(new ApiResponse(200, "All lessons fetched successfully", lessons));
  });

  // ✅ PUBLISH LESSON
  static PublishLesson = AsyncHandler(async (req, res) => {
    const lesson = await Lesson.findByIdAndUpdate(
      req.params.lessonId,
      { isPublished: true },
      { new: true }
    );
    if (!lesson) throw new ApiError(404, "Lesson not found");
    res.json(new ApiResponse(200, "Lesson published successfully", lesson));
  });

  // ✅ UNPUBLISH ALL LESSONS
  static UnpublishAllLessons = AsyncHandler(async (req, res) => {
    const { courseId } = req.params;
    await Lesson.updateMany({ courseId }, { isPublished: false });
    res.json(new ApiResponse(200, "All lessons unpublished successfully"));
  });

  // ✅ GET TOP LESSONS
  static GetTopLessons = AsyncHandler(async (_, res) => {
    const lessons = await Lesson.find(
      {},
      { lessonName: 1, lessonDescription: 1, lessonMediaType: 1, createdAt: 1 }
    )
      .sort({ views: -1 })
      .limit(5);
    res.json(new ApiResponse(200, "Top lessons fetched successfully", lessons));
  });

  static GetCourseProgress = AsyncHandler(async (req, res) => {
    const { courseId, userId } = req.params;
    const course = await CourseController.#findCourseById(courseId);
    if (!course) throw new ApiError(404, "Course not found");

    const totalLessons = await Lesson.countDocuments({ courseId });
    const completedLessons = await Lesson.countDocuments({
      courseId,
      completedBy: userId,
    });

    const progressPercentage =
      totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    res.json(
      new ApiResponse(200, "Course progress fetched successfully", {
        totalLessons,
        completedLessons,
        progressPercentage,
      })
    );
  });
}
