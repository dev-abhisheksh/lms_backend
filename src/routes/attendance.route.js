import express from "express";
import { 
    markAttendance, 
    getAttendanceByDate, 
    getCourseAttendanceReport, 
    getMyAttendance 
} from "../controllers/attendance.controller.js";
import authorizeRoles from "../middlewares/role.middleware.js";
import verifyJWT from "../middlewares/auth.midleware.js";

const router = express.Router();

router.use(verifyJWT);

// Teacher/Admin Routes
router.post("/mark",verifyJWT, authorizeRoles("teacher", "admin"), markAttendance);
router.get("/course/:courseId", verifyJWT, authorizeRoles("teacher", "admin"), getAttendanceByDate);
router.get("/report/:courseId", verifyJWT, authorizeRoles("teacher", "admin"), getCourseAttendanceReport);

// Student/Generic Routes
router.get("/my-attendance/:courseId", getMyAttendance);

export default router;
