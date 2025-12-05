import express from "express"
import verifyJWT from "../middlewares/auth.midleware.js";
import authorizeRoles from "../middlewares/role.middleware.js";
import { createAssignment, deleteAssignment, getAssignmentByID, getAssignments, getAssignmentSummary, togglePublishUnpublishAssignment, updateAssignment } from "../controllers/assignment.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

router.post("/create/:courseId", verifyJWT, authorizeRoles("admin", "teacher"), upload.array("attachments", 5), createAssignment)
router.patch("/update/:assignmentId", verifyJWT, authorizeRoles("admin", "teacher"), upload.array("attachments", 5), updateAssignment)
router.get("/assignments/:courseId", verifyJWT, authorizeRoles("admin", "teacher", "student"), getAssignments)
router.get("/assignment/:assignmentId", verifyJWT, getAssignmentByID)
router.patch("/toggle/:assignmentId", verifyJWT, authorizeRoles("admin", "teacher"), togglePublishUnpublishAssignment)
router.patch("/delete/:assignmentId", verifyJWT, authorizeRoles("admin", "teacher"), deleteAssignment)
router.get("/summary/:assignmentId", verifyJWT, authorizeRoles("admin", "teacher"), getAssignmentSummary)

export default router;