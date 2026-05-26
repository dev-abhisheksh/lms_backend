import express from "express";
import verifyJWT from "../middlewares/auth.midleware.js";
import authorizeRoles from "../middlewares/role.middleware.js";
import { assignUserToCourse, getAllEnrollmentsForCourse, getCourseEnrollmentsSummary, getMyEnrollments, removeUserFromCourse, batchEnrollCourse } from "../controllers/courseEnrollment.controller.js";
import rateLimiter from "../middlewares/rateLimiter.js";

const router = express.Router();

router.post("/new/:courseId", verifyJWT, authorizeRoles("admin", "manager"), rateLimiter({ keyPrefix: "createEnrollment", limit: 30, windowSec: 60 }), assignUserToCourse);
router.post("/batch-enroll", verifyJWT, authorizeRoles("admin", "manager"), rateLimiter({ keyPrefix: "batchEnroll", limit: 10, windowSec: 60 }), batchEnrollCourse);
router.get("/participants/:courseId", verifyJWT, authorizeRoles("admin", "teacher"), getAllEnrollmentsForCourse)
router.get("/my-enrollments", verifyJWT, getMyEnrollments)
router.delete("/remove/:courseId", verifyJWT, authorizeRoles("admin", "manager"), rateLimiter({ keyPrefix: "deleteEnrollment", limit: 30, windowSec: 60 }), removeUserFromCourse)
router.get("/summary/:courseId", verifyJWT, authorizeRoles("admin", "manager", "teacher"), rateLimiter({ keyPrefix: "summaryCourse", limit: 15, windowSec: 60 }), getCourseEnrollmentsSummary)

export default router;