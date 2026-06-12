import express from "express";
import verifyJWT from "../../middlewares/auth.midleware.js";
import authorizeRoles from "../../middlewares/role.middleware.js";
import { 
    getMyDepartment, 
    getDepartmentOverviewStats, 
    getDepartmentActivity 
} from "./manager.controller.js";

const router = express.Router();

// All manager routes require authentication and manager role
router.use(verifyJWT);
router.use(authorizeRoles("manager"));

router.get("/department", getMyDepartment);
router.get("/stats/overview", getDepartmentOverviewStats);
router.get("/activity", getDepartmentActivity);

export default router;
