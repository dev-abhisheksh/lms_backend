import express from "express";
import verifyJWT from "../middlewares/auth.midleware.js";
import authorizeRoles from "../middlewares/role.middleware.js";
import { createModule, getAllModules, getModuleById } from "../controllers/module.controller.js";


const router = express.Router();

router.post("/create/:courseId", verifyJWT, authorizeRoles("admin", "teacher"), createModule)
router.get("/:courseId", verifyJWT, getAllModules)
router.get("/module/:moduleId", verifyJWT, getModuleById)

export default router;