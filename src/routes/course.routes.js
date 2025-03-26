import { Router } from "express";

import { upload } from "../middleware/file-upload.middleware.js";
import { CourseController } from "../controller/course.controller.js";

const CourseRouter = Router();

// Create a new course
CourseRouter.route("/courses/:userId").post(
  upload.single("coverImage"),
  CourseController.CreateCourse
);

// Get all courses
CourseRouter.route("/courses").get(CourseController.GetAllCourses);

// Get a specific course by ID
CourseRouter.route("/courses/:courseId").get(CourseController.GetCourseById);

// Enroll and Unenroll from a course
CourseRouter.route("/courses/:courseId/enroll/:userId").post(
  CourseController.ToggleEnrollment
);

// Search for courses
CourseRouter.route("/courses/search").get(CourseController.SearchCourses);

// Create a lesson and get all lessons for a course
CourseRouter.route("/courses/:courseId/lessons")
  .post(CourseController.CreateLesson)
  .get(CourseController.GetAllLessonsByCourseId);

// Publish a lesson
CourseRouter.route("/lessons/:lessonId/publish").patch(
  CourseController.PublishLesson
);

// Unpublish all lessons in a course
CourseRouter.route("/courses/:courseId/unpublish-lessons").patch(
  CourseController.UnpublishAllLessons
);

export default CourseRouter;
