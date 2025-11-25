import express from "express"
import verifyJWT from "../middlewares/auth.midleware.js";
import authorizeRoles from "../middlewares/role.middleware.js";
import { createAssignment, deleteAssignment, getAssignmentById, getAssignmentsByCourse, togglePublishAssignment, updateAssignment } from "../controllers/assignment.controller.js";

const router = express.Router();

router.post("/create", verifyJWT, authorizeRoles("admin", "teacher"), createAssignment)
router.get("/:courseId", verifyJWT, getAssignmentsByCourse)
router.patch("/update/:assignmentId", verifyJWT, authorizeRoles("admin", "manager", "teacher"), updateAssignment)
router.delete("/delete/:assignmentId", verifyJWT, authorizeRoles("admin", "manager", "teacher"), deleteAssignment)
router.patch("/publish/:assignmentId", verifyJWT, authorizeRoles("admin", "manager", "teacher"), togglePublishAssignment)
router.get("/assignment/:assignmentId", verifyJWT, getAssignmentById)

export default router;