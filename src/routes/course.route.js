import express from "express"
import verifyJWT from "../middlewares/auth.midleware.js";
import authorizeRoles from "../middlewares/role.middleware.js";
import { createCourse, getAllCourses, getCourseById, getMyCourse, publishCourse, updateCourse } from "../controllers/course.controller.js";
import rateLimiter from "../middlewares/rateLimiter.js";

const router = express.Router();

router.post("/create/:departmentId", verifyJWT, authorizeRoles("teacher", "admin"), rateLimiter({ keyPrefix: "createCourse", limit: 5, windowSec: 60 }), createCourse)
router.get("/", verifyJWT, rateLimiter({ keyPrefix: "courses", limit: 10, windowSec: 60 }), getAllCourses);
router.get("/my-courses", verifyJWT, getMyCourse)
router.get("/course/:courseId", verifyJWT, getCourseById)
router.patch("/update/:courseId", verifyJWT, authorizeRoles("admin", "teacher"), rateLimiter({ keyPrefix: "updateCourse", limit: 10, windowSec: 300 }), updateCourse)
router.patch("/publish/:courseId", verifyJWT, authorizeRoles("admin", "teacher"), rateLimiter({ keyPrefix: "toggleCourse", limit: 10, windowSec: 60 }), publishCourse)

export default router;