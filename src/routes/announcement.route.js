import express from "express";
import verifyJWT from "../middlewares/auth.midleware.js";
import authorizeRoles from "../middlewares/role.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
    createAnnouncement,
    getCourseAnnouncements,
    deleteAnnouncement
} from "../controllers/announcement.controller.js";

const router = express.Router();

router.use(verifyJWT);

router.get("/course/:courseId", getCourseAnnouncements);

router.post(
    "/course/:courseId",
    authorizeRoles("teacher", "admin"),
    upload.array("attachments", 5),
    createAnnouncement
);

router.delete("/:id", authorizeRoles("teacher", "admin"), deleteAnnouncement);

export default router;
