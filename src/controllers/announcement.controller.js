import { Announcement } from "../models/announcement.model.js";
import { CourseEnrollment } from "../models/courseEnrollment.model.js";
import { Notification } from "../models/notification.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";

const createAnnouncement = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { title, content, isPinned } = req.body;

        if (!title || !content) {
            return res.status(400).json({ message: "Title and content are required" });
        }

        const attachments = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const result = await uploadToCloudinary(file.buffer, "announcements");
                attachments.push({
                    public_id: result.public_id,
                    url: result.url,
                    secure_url: result.secure_url,
                    format: result.format,
                    original_filename: file.originalname
                });
            }
        }

        const announcement = await Announcement.create({
            title,
            content,
            course: courseId,
            author: req.user._id,
            attachments,
            isPinned: isPinned === "true" || isPinned === true
        });

        // Get all enrolled students and teachers to notify them
        const enrollments = await CourseEnrollment.find({ course: courseId }).select("user");
        const recipients = enrollments
            .filter(e => e.user.toString() !== req.user._id.toString())
            .map(e => e.user);

        // Create notifications in bulk
        if (recipients.length > 0) {
            const notifications = recipients.map(recipientId => ({
                recipient: recipientId,
                sender: req.user._id,
                type: "announcement",
                title: `New Announcement: ${title}`,
                message: content.substring(0, 100) + (content.length > 100 ? "..." : ""),
                link: `/course/${courseId}/announcements`,
                metadata: { announcementId: announcement._id, courseId }
            }));

            await Notification.insertMany(notifications);

            // Emit socket event to the course room
            if (global.io) {
                global.io.to(`course-${courseId}`).emit("new-announcement", {
                    announcement,
                    courseId
                });
                
                // Also emit individual notifications
                recipients.forEach(recipientId => {
                    global.io.to(`user-${recipientId}`).emit("notification", {
                        type: "announcement",
                        title: `New Announcement: ${title}`,
                        courseId
                    });
                });
            }
        }

        res.status(201).json({
            message: "Announcement created successfully",
            announcement
        });
    } catch (error) {
        console.error("Create Announcement Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const getCourseAnnouncements = async (req, res) => {
    try {
        const { courseId } = req.params;

        // Verify enrollment if user is a student
        if (req.user.role === "student") {
            const enrollment = await CourseEnrollment.findOne({
                user: req.user._id,
                course: courseId
            });
            if (!enrollment) {
                return res.status(403).json({ message: "You are not enrolled in this course" });
            }
        }

        const announcements = await Announcement.find({ course: courseId })
            .populate("author", "firstName lastName profilePicture")
            .sort({ isPinned: -1, createdAt: -1 });

        res.status(200).json(announcements);
    } catch (error) {
        console.error("Get Announcements Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        const announcement = await Announcement.findById(id);

        if (!announcement) {
            return res.status(404).json({ message: "Announcement not found" });
        }

        // Only author or admin (implement role check if needed) can delete
        if (announcement.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized" });
        }

        await Announcement.findByIdAndDelete(id);

        res.status(200).json({ message: "Announcement deleted successfully" });
    } catch (error) {
        console.error("Delete Announcement Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export {
    createAnnouncement,
    getCourseAnnouncements,
    deleteAnnouncement
};
