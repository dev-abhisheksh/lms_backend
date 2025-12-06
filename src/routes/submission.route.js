import express from "express"
import verifyJWT from "../middlewares/auth.midleware.js"
import authorizeRoles from "../middlewares/role.middleware.js";
import { createSubmission, deleteSubmission, getAllSubmissions, getSingleSubmission, getSubmissionStatusForAssignment, gradingSubissions, mySubmissions, updateSubmission } from "../controllers/submission.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

router.post("/create/:assignmentId", verifyJWT, authorizeRoles("student"), upload.array("files", 5), createSubmission)
router.get("/submissions/:assignmentId", verifyJWT, authorizeRoles("admin", "teacher"), getAllSubmissions)
router.post("/grade/:submissionId", verifyJWT, authorizeRoles("teacher", "admin"), gradingSubissions)
router.patch("/delete/:submissionId", verifyJWT, authorizeRoles("admin", "student"), deleteSubmission)
router.get("/my-submissions", verifyJWT, authorizeRoles("student"), mySubmissions)
router.get("/submission/:submissionId", verifyJWT, authorizeRoles("admin", "teacher"), getSingleSubmission)
router.patch("/update/:submissionId", verifyJWT, authorizeRoles("student"), upload.array("files", 5), updateSubmission)
router.get("/submission-status/:assignmentId", verifyJWT, authorizeRoles("admin", "teacher"), getSubmissionStatusForAssignment)

export default router;