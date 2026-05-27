import express from "express"
import verifyJWT from "../middlewares/auth.midleware.js";
import { getCurrentUser, loginUser, logoutUser, registerUser, getAllUsers, getBatches, updateBatchYear, updateUserRole } from "../controllers/auth.controller.js";
import authorizeRoles from "../middlewares/role.middleware.js";
import rateLimiter from "../middlewares/rateLimiter.js";

const router = express.Router();


router.post("/register", rateLimiter({ keyPrefix: "register", limit: 3, windowSec: 60 }), registerUser)
router.post("/login", rateLimiter({ keyPrefix: "login", limit: 5, windowSec: 60 }), loginUser)
router.patch("/logout",verifyJWT, logoutUser)
router.get("/me", verifyJWT, getCurrentUser);
router.get("/all-users", verifyJWT, authorizeRoles("admin"), rateLimiter({ keyPrefix: "allUsers", limit: 20, windowSec: 60 }), getAllUsers)
router.get("/batches", verifyJWT, authorizeRoles("admin"), rateLimiter({ keyPrefix: "batches", limit: 20, windowSec: 60 }), getBatches)
router.patch("/batches/update-year", verifyJWT, authorizeRoles("admin"), rateLimiter({ keyPrefix: "updateBatch", limit: 10, windowSec: 60 }), updateBatchYear)
router.patch("/update-role/:userId", verifyJWT, authorizeRoles("admin"), rateLimiter({ keyPrefix: "updateUserRole", limit: 10, windowSec: 60 }), updateUserRole)

export default router;