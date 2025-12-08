import express from "express";
import verifyJWT from "../middlewares/auth.midleware.js";
import authorizeRoles from "../middlewares/role.middleware.js";
import { createLesson, deleteLesson, getLessonById, getLessonsByModule, toggleLesson, updateLesson } from "../controllers/lesson.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

router.post("/create/:moduleId", verifyJWT, authorizeRoles("admin", "teacher"), upload.array("files", 5), createLesson)
router.get("/:moduleId", verifyJWT, getLessonsByModule)
router.get("/lesson/:lessonId", verifyJWT, getLessonById)
router.patch("/update/:lessonId", verifyJWT, authorizeRoles("admin", "teacher"), upload.array("files", 5), updateLesson)
router.patch("/toggle/:lessonId", verifyJWT, authorizeRoles("admin", "teacher"), toggleLesson)
router.delete("/delete/:lessonId", verifyJWT, authorizeRoles("admin"), deleteLesson)

export default router;