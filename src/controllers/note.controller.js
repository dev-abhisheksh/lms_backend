import { Note } from "../models/note.model.js";
import { Course } from "../models/course.model.js";
import { CourseEnrollment } from "../models/courseEnrollment.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

export const createNote = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { title, content, isPublished } = req.body;

        if (!courseId || !title?.trim()) {
            return res.status(400).json({ message: "courseId and title are required" });
        }

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: "Course not found" });

        if (req.user.role === "teacher") {
            const enrollment = await CourseEnrollment.findOne({ user: req.user._id, course: courseId, role: "teacher" });
            if (!enrollment) return res.status(403).json({ message: "Not assigned to teach this course" });
        } else if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        let attachments = [];
        if (req.files?.length > 0) {
            attachments = await Promise.all(
                req.files.map(async (file) => {
                    const uploaded = await uploadToCloudinary(file.buffer, "notes_attachments");
                    return {
                        public_id: uploaded.public_id,
                        url: uploaded.url,
                        secure_url: uploaded.secure_url,
                        bytes: uploaded.bytes,
                        format: uploaded.format,
                        original_filename: uploaded.original_filename,
                    };
                })
            );
        }

        const note = await Note.create({
            title: title.trim(),
            content: content?.trim() || "",
            attachments,
            isPublished: Boolean(isPublished === "true" || isPublished === true),
            publishedAt: isPublished ? new Date() : null,
            course: courseId,
            createdBy: req.user._id,
        });

        return res.status(201).json({ message: "Note created successfully", note });
    } catch (error) {
        console.error("Create Note Error:", error);
        return res.status(500).json({ message: "Failed to create note" });
    }
};

export const getNotesByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: "Course not found" });

        let notes = await Note.find({ course: courseId, isActive: true })
            .populate("createdBy", "fullName email")
            .sort({ createdAt: -1 });

        if (req.user.role === "teacher") {
            const enrollment = await CourseEnrollment.findOne({ user: req.user._id, course: courseId, role: "teacher" });
            if (!enrollment) return res.status(403).json({ message: "Not assigned to this course" });
        } else if (req.user.role === "student") {
            const enrollment = await CourseEnrollment.findOne({ user: req.user._id, course: courseId, role: "student" });
            if (!enrollment) return res.status(403).json({ message: "Not enrolled in this course" });
            notes = notes.filter((n) => n.isPublished);
        }

        return res.status(200).json({ notes });
    } catch (error) {
        console.error("Get Notes Error:", error);
        return res.status(500).json({ message: "Failed to fetch notes" });
    }
};

export const updateNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const { title, content, isPublished } = req.body;

        const note = await Note.findById(noteId);
        if (!note) return res.status(404).json({ message: "Note not found" });

        if (req.user.role === "teacher") {
            const enrollment = await CourseEnrollment.findOne({ user: req.user._id, course: note.course, role: "teacher" });
            if (!enrollment) return res.status(403).json({ message: "Access denied" });
        } else if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        if (title) note.title = title.trim();
        if (content !== undefined) note.content = content.trim();
        if (isPublished !== undefined) {
            note.isPublished = Boolean(isPublished === "true" || isPublished === true);
            if (note.isPublished && !note.publishedAt) note.publishedAt = new Date();
        }

        // Handle new file uploads
        if (req.files?.length > 0) {
            const newAttachments = await Promise.all(
                req.files.map(async (file) => {
                    const uploaded = await uploadToCloudinary(file.buffer, "notes_attachments");
                    return {
                        public_id: uploaded.public_id,
                        url: uploaded.url,
                        secure_url: uploaded.secure_url,
                        bytes: uploaded.bytes,
                        format: uploaded.format,
                        original_filename: uploaded.original_filename,
                    };
                })
            );
            note.attachments = [...note.attachments, ...newAttachments];
        }

        await note.save();

        return res.status(200).json({ message: "Note updated", note });
    } catch (error) {
        console.error("Update Note Error:", error);
        return res.status(500).json({ message: "Failed to update note" });
    }
};

export const deleteNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const note = await Note.findById(noteId);
        if (!note) return res.status(404).json({ message: "Note not found" });

        if (req.user.role === "teacher") {
            const enrollment = await CourseEnrollment.findOne({ user: req.user._id, course: note.course, role: "teacher" });
            if (!enrollment) return res.status(403).json({ message: "Access denied" });
        } else if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        note.isActive = false;
        note.isPublished = false;
        await note.save();

        return res.status(200).json({ message: "Note deleted successfully" });
    } catch (error) {
        console.error("Delete Note Error:", error);
        return res.status(500).json({ message: "Failed to delete note" });
    }
};

export const togglePublishNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const note = await Note.findById(noteId);
        if (!note) return res.status(404).json({ message: "Note not found" });

        if (req.user.role === "teacher") {
            const enrollment = await CourseEnrollment.findOne({ user: req.user._id, course: note.course, role: "teacher" });
            if (!enrollment) return res.status(403).json({ message: "Access denied" });
        } else if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        note.isPublished = !note.isPublished;
        if (note.isPublished) note.publishedAt = new Date();
        await note.save();

        return res.status(200).json({ message: "Note publish status updated", note });
    } catch (error) {
        console.error("Toggle Publish Note Error:", error);
        return res.status(500).json({ message: "Failed to toggle note publish" });
    }
};
