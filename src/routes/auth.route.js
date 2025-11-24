import express from "express"
import verifyJWT from "../middlewares/auth.midleware.js";
import { loginUser, registerUser } from "../controllers/auth.controller.js";
import authorizeRoles from "../middlewares/role.middleware.js";

const router = express.Router();

//register
router.post("/register", registerUser)
router.post("/login", loginUser)

router.get("/hi", verifyJWT, authorizeRoles("admin"), (req, res) => {
    res.send("Admin only");
});

router.get("/hi1", verifyJWT, authorizeRoles("admin", "manager"), (req, res) => {
    res.send("Admin & Manager only");
});

router.get("/hi2", verifyJWT, authorizeRoles("admin", "manager", "user"), (req, res) => {
    res.send("Open for all");
});

export default router;