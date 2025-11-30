import express from "express"
import verifyJWT from "../middlewares/auth.midleware.js"
import authorizeRoles from "../middlewares/role.middleware.js";
import { createDepartment, getAllDepartments, getDepartmentById, toggleDepartment, updateDepartment } from "../controllers/department.controller.js";
const router = express.Router();

router.post("/create", verifyJWT, authorizeRoles("admin"), createDepartment)
router.get("/", verifyJWT, getAllDepartments)
router.get("/:departmentId", verifyJWT, getDepartmentById)
router.get("/toggle-department/:departmentId", verifyJWT, authorizeRoles("admin"), toggleDepartment)
router.patch("/update/:departmentId", verifyJWT, authorizeRoles("admin"), updateDepartment)

export default router;