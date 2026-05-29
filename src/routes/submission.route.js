import express from "express"
import verifyJWT from "../middlewares/auth.midleware.js"
import authorizeRoles from "../middlewares/role.middleware.js";
import { createSubmission, deleteSubmission, getAllSubmissions, getSingleSubmission, getSubmissionStatusForAssignment, gradingSubissions, mySubmissions, updateSubmission } from "../controllers/submission.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import rateLimiter from "../middlewares/rateLimiter.js";

const router = express.Router();

router.post("/create/:assignmentId", verifyJWT, authorizeRoles("student"), rateLimiter({ keyPrefix: "createSubmission", limit: 5, windowSec: 60 }), upload.array("files", 5), createSubmission)

router.get("/submissions/:assignmentId", verifyJWT, authorizeRoles("admin", "teacher"), getAllSubmissions)
router.post("/grade/:submissionId", verifyJWT, authorizeRoles("teacher", "admin"), rateLimiter({ keyPrefix: "gradeSubmissions", limit: 40, windowSec: 60 }), gradingSubissions)

router.patch("/delete/:submissionId", verifyJWT, authorizeRoles("admin", "student"), rateLimiter({ keyPrefix: "deleteSubmission", limit: 15, windowSec: 60 }), deleteSubmission)
router.get("/my-submissions", verifyJWT, authorizeRoles("student"), mySubmissions)
router.get("/submission/:submissionId", verifyJWT, authorizeRoles("admin", "teacher", "student"), getSingleSubmission)
router.patch("/update/:submissionId", verifyJWT, authorizeRoles("student"), rateLimiter({ keyPrefix: "updateSubmission", limit: 5, windowSec: 60 }), upload.array("files", 5), updateSubmission)
router.get("/submission-status/:assignmentId", verifyJWT, authorizeRoles("admin", "teacher"), rateLimiter({ keyPrefix: "submissionsStats", limit: 30, windowSec: 60 }), getSubmissionStatusForAssignment)

export default router;