import express from "express";
import verifyJWT from "../middlewares/auth.midleware.js";
import authorizeRoles from "../middlewares/role.middleware.js";
import { createModule, deleteModule, getAllModules, getModuleById, toggleModule, updateModule } from "../controllers/module.controller.js";


const router = express.Router();

router.post("/create/:courseId", verifyJWT, authorizeRoles("admin", "teacher"), createModule)
router.get("/:courseId", verifyJWT, getAllModules)
router.get("/module/:moduleId", verifyJWT, getModuleById)
router.patch("/update/:moduleId", verifyJWT, authorizeRoles("admin", "teacher"), updateModule)
router.patch("/toggle/:moduleId", verifyJWT, authorizeRoles("admin"), toggleModule)
router.delete("/delete/:moduleId", verifyJWT, authorizeRoles("admin", deleteModule))

export default router;