import express from "express"
import verifyJWT from "../middlewares/auth.midleware.js"
import authorizeRoles from "../middlewares/role.middleware.js";
import { createDepartment, getAllDepartments, getDepartmentById, toggleDepartment, updateDepartment, assignManager } from "../controllers/department.controller.js";
import rateLimiter from "../middlewares/rateLimiter.js";
const router = express.Router();

router.post("/create", verifyJWT, authorizeRoles("admin"), rateLimiter({ keyPrefix: "createDepartment", limit: 30, windowSec: 60 }), createDepartment)
router.get("/", verifyJWT, getAllDepartments)
router.get("/:departmentId", verifyJWT, getDepartmentById)

router.get("/toggle-department/:departmentId", verifyJWT, authorizeRoles("admin"), rateLimiter
    ({ keyPrefix: "toggleDepartment", limit: 40, windowSec: 60 }), toggleDepartment)

router.patch("/update/:departmentId", verifyJWT, authorizeRoles("admin"), rateLimiter
    ({ keyPrefix: "updateDepartment", limit: 30, windowSec: 60 }), updateDepartment)

router.patch("/assign-manager/:departmentId", verifyJWT, authorizeRoles("admin"), rateLimiter
    ({ keyPrefix: "assignManager", limit: 20, windowSec: 60 }), assignManager)

export default router;