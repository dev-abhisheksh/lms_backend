import { Router } from "express";
import {
    createTest,
    getTestsByCourse,
    updateTest,
    deleteTest,
    togglePublishTest,
    getTestById,
    submitTest,
    getMyTestSubmissions,
    getTestSubmissions,
    gradeTestSubmission
} from "../controllers/test.controller.js";
import authorizeRoles from "../middlewares/role.middleware.js";
import verifyJWT from "../middlewares/auth.midleware.js";


const router = Router();

router.use(verifyJWT);

// Create a new test (Admin or Teacher)
router.post("/course/:courseId", authorizeRoles("admin", "teacher"), createTest);

// Get my test submissions (Student) - PLACE THIS BEFORE /:testId
router.get("/my-submissions", authorizeRoles("student"), getMyTestSubmissions);

// Get all submissions for a test (Teacher or Admin)
router.get("/:testId/submissions", authorizeRoles("admin", "teacher"), getTestSubmissions);

// Grade a test submission (Teacher or Admin)
router.post("/submission/:submissionId/grade", authorizeRoles("admin", "teacher"), gradeTestSubmission);

// Get tests for a course (Admin, Teacher, Student)
router.get("/course/:courseId", authorizeRoles("admin", "teacher", "student"), getTestsByCourse);

// Get a single test by ID
router.get("/:testId", authorizeRoles("admin", "teacher", "student"), getTestById);

// Submit a test (Student)
router.post("/:testId/submit", authorizeRoles("student"), submitTest);

// Update a test (Admin or Teacher)
router.put("/:testId", authorizeRoles("admin", "teacher"), updateTest);

// Delete a test (Admin or Teacher)
router.delete("/:testId", authorizeRoles("admin", "teacher"), deleteTest);

// Toggle publish status (Admin or Teacher)
router.patch("/:testId/publish", authorizeRoles("admin", "teacher"), togglePublishTest);

export default router;
