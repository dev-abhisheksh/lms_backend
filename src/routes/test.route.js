import { Router } from "express";
import {
    createTest,
    getTestsByCourse,
    updateTest,
    deleteTest,
    togglePublishTest
} from "../controllers/test.controller.js";
import authorizeRoles from "../middlewares/role.middleware.js";
import verifyJWT from "../middlewares/auth.midleware.js";


const router = Router();

router.use(verifyJWT);

// Create a new test (Admin or Teacher)
router.post("/course/:courseId", authorizeRoles("admin", "teacher"), createTest);

// Get tests for a course (Admin, Teacher, Student)
router.get("/course/:courseId", authorizeRoles("admin", "teacher", "student"), getTestsByCourse);

// Update a test (Admin or Teacher)
router.put("/:testId", authorizeRoles("admin", "teacher"), updateTest);

// Delete a test (Admin or Teacher)
router.delete("/:testId", authorizeRoles("admin", "teacher"), deleteTest);

// Toggle publish status (Admin or Teacher)
router.patch("/:testId/publish", authorizeRoles("admin", "teacher"), togglePublishTest);

export default router;
