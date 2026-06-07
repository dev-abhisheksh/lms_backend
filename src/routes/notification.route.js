import express from "express";
import verifyJWT from "../middlewares/auth.midleware.js";
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
} from "../controllers/notification.controller.js";

const router = express.Router();

router.use(verifyJWT);

router.get("/", getNotifications);
router.patch("/mark-all-read", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

export default router;
