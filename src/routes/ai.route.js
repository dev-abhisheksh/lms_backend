import express from "express"
import verifyJWT from "../middlewares/auth.midleware.js"
import authorizeRoles from "../middlewares/role.middleware.js"
import { enhanceDescription, generateModuleDescription, reWriteAssignmentQuestion } from "../controllers/ai.controller.js"
import rateLimiter from "../middlewares/rateLimiter.js"

const router = express.Router()

router.post("/module-description", verifyJWT, authorizeRoles("admin", "teacher"), generateModuleDescription)
router.post("/enhance-assignment-question", verifyJWT, authorizeRoles("admin", "student"), reWriteAssignmentQuestion)
router.post("/enhance-description", verifyJWT, authorizeRoles("admin", "teacher"), rateLimiter({ keyPrefix: "ai:global", limit: 12, windowSec: 60 }), rateLimiter({ keyPrefix: "ai:user", limit: 5, windowSec: 3600 }), enhanceDescription)

export default router