import express from "express";
import verifyJWT from "../middlewares/auth.midleware.js";
import authorizeRoles from "../middlewares/role.middleware.js";
import { assignUserToCourse, getCourseParticipants, getMyEnrollments } from "../controllers/courseEnrollment.controller.js";
const router = express.Router();

router.post("/new/:courseId", verifyJWT, authorizeRoles("admin", "manager"), assignUserToCourse);
router.get("/participants/:courseId", verifyJWT, authorizeRoles("admin", "manager", "teacher"), getCourseParticipants)
router.get("/me", verifyJWT, getMyEnrollments)

export default router;