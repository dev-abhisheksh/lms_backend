import { Router } from "express";
import {
    createNote,
    getNotesByCourse,
    updateNote,
    deleteNote,
    togglePublishNote,
} from "../controllers/note.controller.js";
import authorizeRoles from "../middlewares/role.middleware.js";
import verifyJWT from "../middlewares/auth.midleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.use(verifyJWT);

// Create a note with file attachments
router.post("/course/:courseId", authorizeRoles("admin", "teacher"), upload.array("attachments", 10), createNote);

// Get notes for a course
router.get("/course/:courseId", authorizeRoles("admin", "teacher", "student"), getNotesByCourse);

// Update a note (can add more files)
router.put("/:noteId", authorizeRoles("admin", "teacher"), upload.array("attachments", 10), updateNote);

// Delete a note
router.delete("/:noteId", authorizeRoles("admin", "teacher"), deleteNote);

// Toggle publish
router.patch("/:noteId/publish", authorizeRoles("admin", "teacher"), togglePublishNote);

export default router;
