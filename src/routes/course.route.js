import express from "express"
import verifyJWT from "../middlewares/auth.midleware.js";
import authorizeRoles from "../middlewares/role.middleware.js";
import { createCourse, deleteCourse, getAllCourses, getCourseById, publishCourse, updateCourse } from "../controllers/course.controller.js";

const router = express.Router();

router.post("/create", verifyJWT, authorizeRoles("teacher", "admin"), createCourse)
router.get("/courses", verifyJWT, getAllCourses);
router.get("/course/:id", verifyJWT, getCourseById)
router.patch("/update/:id", verifyJWT, authorizeRoles("admin", "teacher"), updateCourse)
router.delete("/delete/:id", verifyJWT, authorizeRoles("admin", "manager"), deleteCourse)
router.patch("/publish/:id", verifyJWT, authorizeRoles("admin", "teacher"), publishCourse)

export default router;