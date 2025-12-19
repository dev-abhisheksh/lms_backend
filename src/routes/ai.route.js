import express from "express"
import verifyJWT from "../middlewares/auth.midleware.js"
import authorizeRoles from "../middlewares/role.middleware.js"
import { enhanceDescription, generateModuleDescription, reWriteAssignmentQuestion } from "../controllers/ai.controller.js"

const router = express.Router()

router.post("/module-description", verifyJWT, authorizeRoles("admin", "teacher"), generateModuleDescription)
router.post("/enhance-assignment-question", verifyJWT, authorizeRoles("admin", "student"), reWriteAssignmentQuestion)
router.post("/enhance-description", verifyJWT, authorizeRoles("admin", "teacher"), enhanceDescription)

export default router