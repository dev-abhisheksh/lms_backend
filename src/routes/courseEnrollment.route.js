import express from "express";
import verifyJWT from "../middlewares/auth.midleware.js";
import authorizeRoles from "../middlewares/role.middleware.js";
import { assignUserToCourse, getAllEnrollmentsForCourse, getCourseEnrollmentsSummary, getMyEnrollments, removeUserFromCourse } from "../controllers/courseEnrollment.controller.js";
const router = express.Router();

router.post("/new/:courseId", verifyJWT, authorizeRoles("admin", "manager"), assignUserToCourse);
router.get("/participants/:courseId", verifyJWT, authorizeRoles("admin", "teacher"), getAllEnrollmentsForCourse)
router.get("/my-enrollments", verifyJWT, getMyEnrollments)
router.delete("/remove/:courseId/:userId", verifyJWT, authorizeRoles("admin", "manager"), removeUserFromCourse)
router.get("/summary/:courseId", verifyJWT, authorizeRoles("admin", "manager", "teacher"), getCourseEnrollmentsSummary)

export default router;