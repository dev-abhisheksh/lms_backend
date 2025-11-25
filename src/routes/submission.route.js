import express from "express"
import verifyJWT from "../middlewares/auth.midleware.js"
import authorizeRoles from "../middlewares/role.middleware.js";
import { createSubmission } from "../controllers/submission.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

router.post("/create/:assignmentId", verifyJWT, authorizeRoles("student"),upload.single("file"), createSubmission)

export default router;