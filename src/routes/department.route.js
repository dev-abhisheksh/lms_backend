import express from "express"
import verifyJWT from "../middlewares/auth.midleware.js"
import authorizeRoles from "../middlewares/role.middleware.js";
import { createDepartment, getAllDepartments } from "../controllers/department.controller.js";
const router = express.Router();

router.post("/create", verifyJWT, authorizeRoles("admin"), createDepartment)
router.get("/", verifyJWT, getAllDepartments)

export default router;