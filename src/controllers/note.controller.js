import { Note } from "../models/note.model.js";
import { Course } from "../models/course.model.js";
import { CourseEnrollment } from "../models/courseEnrollment.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

export const createNote = async (req, res) => {
    try {
        // Controller Level RBAC
        if (req.user.role !== "teacher" && req.user.role !== "admin") {
            return res.status(403).json({ message: "Only teachers and admins can create materials" });
        }

        const { courseId } = req.params;
        const { title, content, isPublished, type, lessonName, chapter, youtubeUrl, semester } = req.body;

        if (!courseId || !title?.trim()) {
            return res.status(400).json({ message: "courseId and title are required" });
        }

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: "Course not found" });

        if (req.user.role === "teacher") {
            const enrollment = await CourseEnrollment.findOne({ user: req.user._id, course: courseId, role: "teacher" });
            if (!enrollment) return res.status(403).json({ message: "You are not assigned to teach this course" });
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
            type: type || "note",
            content: content?.trim() || "",
            lessonName: lessonName?.trim(),
            chapter: chapter?.trim(),
            youtubeUrl: youtubeUrl?.trim(),
            semester: semester ? Number(semester) : undefined,
            attachments,
            isPublished: Boolean(isPublished === "true" || isPublished === true),
            publishedAt: (isPublished === "true" || isPublished === true) ? new Date() : null,
            course: courseId,
            createdBy: req.user._id,
        });

        return res.status(201).json({ message: "Material created successfully", note });
    } catch (error) {
        console.error("Create Material Error:", error);
        return res.status(500).json({ message: "Failed to create material" });
    }
};

export const getNotesByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: "Course not found" });

        let query = { course: courseId, isActive: true };

        if (req.user.role === "teacher") {
            const enrollment = await CourseEnrollment.findOne({ user: req.user._id, course: courseId, role: "teacher" });
            if (!enrollment) return res.status(403).json({ message: "Not assigned to this course" });
        } else if (req.user.role === "student") {
            const enrollment = await CourseEnrollment.findOne({ user: req.user._id, course: courseId, role: "student" });
            if (!enrollment) return res.status(403).json({ message: "Not enrolled in this course" });
            query.isPublished = true;
        } else if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        const notes = await Note.find(query)
            .populate("createdBy", "fullName email")
            .sort({ createdAt: -1 });

        return res.status(200).json({ notes });
    } catch (error) {
        console.error("Get Materials Error:", error);
        return res.status(500).json({ message: "Failed to fetch materials" });
    }
};

export const updateNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const { title, content, isPublished, type, lessonName, chapter, youtubeUrl, semester } = req.body;

        const note = await Note.findById(noteId);
        if (!note) return res.status(404).json({ message: "Material not found" });

        // Controller Level RBAC
        if (req.user.role !== "admin") {
            if (req.user.role === "teacher") {
                const enrollment = await CourseEnrollment.findOne({ user: req.user._id, course: note.course, role: "teacher" });
                if (!enrollment) return res.status(403).json({ message: "Access denied. You are not assigned to this course" });
            } else {
                return res.status(403).json({ message: "Only teachers and admins can update materials" });
            }
        }

        if (title) note.title = title.trim();
        if (type) note.type = type;
        if (content !== undefined) note.content = content.trim();
        if (lessonName !== undefined) note.lessonName = lessonName.trim();
        if (chapter !== undefined) note.chapter = chapter.trim();
        if (youtubeUrl !== undefined) note.youtubeUrl = youtubeUrl.trim();
        if (semester !== undefined) note.semester = semester ? Number(semester) : undefined;
        
        if (isPublished !== undefined) {
            const newPublishStatus = Boolean(isPublished === "true" || isPublished === true);
            if (newPublishStatus && !note.isPublished) {
                note.publishedAt = new Date();
            }
            note.isPublished = newPublishStatus;
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

        return res.status(200).json({ message: "Material updated successfully", note });
    } catch (error) {
        console.error("Update Material Error:", error);
        return res.status(500).json({ message: "Failed to update material" });
    }
};

export const deleteNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const note = await Note.findById(noteId);
        if (!note) return res.status(404).json({ message: "Material not found" });

        // Controller Level RBAC
        if (req.user.role !== "admin") {
            if (req.user.role === "teacher") {
                const enrollment = await CourseEnrollment.findOne({ user: req.user._id, course: note.course, role: "teacher" });
                if (!enrollment) return res.status(403).json({ message: "Access denied" });
            } else {
                return res.status(403).json({ message: "Access denied" });
            }
        }

        note.isActive = false;
        note.isPublished = false;
        await note.save();

        return res.status(200).json({ message: "Material deleted successfully" });
    } catch (error) {
        console.error("Delete Material Error:", error);
        return res.status(500).json({ message: "Failed to delete material" });
    }
};

export const togglePublishNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const note = await Note.findById(noteId);
        if (!note) return res.status(404).json({ message: "Material not found" });

        // Controller Level RBAC
        if (req.user.role !== "admin") {
            if (req.user.role === "teacher") {
                const enrollment = await CourseEnrollment.findOne({ user: req.user._id, course: note.course, role: "teacher" });
                if (!enrollment) return res.status(403).json({ message: "Access denied" });
            } else {
                return res.status(403).json({ message: "Access denied" });
            }
        }

        note.isPublished = !note.isPublished;
        if (note.isPublished) note.publishedAt = new Date();
        await note.save();

        return res.status(200).json({ message: "Material publish status updated", note });
    } catch (error) {
        console.error("Toggle Publish Material Error:", error);
        return res.status(500).json({ message: "Failed to toggle material publish" });
    }
};
