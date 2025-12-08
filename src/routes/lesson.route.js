import express from "express";
import verifyJWT from "../middlewares/auth.midleware.js";
import authorizeRoles from "../middlewares/role.middleware.js";
import { createLesson, getLessonsByModule } from "../controllers/lesson.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

router.post("/create/:moduleId", verifyJWT, authorizeRoles("admin", "teacher"), upload.array("files", 5), createLesson)
router.get("/:moduleId", verifyJWT, getLessonsByModule)

export default router;