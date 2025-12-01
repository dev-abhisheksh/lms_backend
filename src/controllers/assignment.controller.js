import { Assignment } from "../models/assignment.model.js";
import { Course } from "../models/course.model.js";
import { CourseEnrollment } from "../models/courseEnrollment.model.js";
import { Submission } from "../models/submissions.model.js"
import { uploadToCloudinary } from "../utils/cloudinary.js";

const createAssignment = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { title, description, dueDate, maxMarks } = req.body;

        if (!courseId || !title?.trim() || !dueDate || !maxMarks) {
            return res.status(400).json({
                message: "courseId, title, dueDate & maxMarks are required"
            });
        }

        const cleanTitle = title.trim();
        const cleanDescription = description?.trim() || "";

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: "Course not found" });
        if (!course.isActive) return res.status(403).json({ message: "Course is not active" });
        if (!course.isPublished) return res.status(403).json({ message: "Course is not published" });

        if (req.user.role !== "admin") {
            if (req.user.role !== "teacher") {
                return res.status(403).json({ message: "Access denied: Not authorized" });
            }

            const teacherEnrollment = await CourseEnrollment.findOne({
                user: req.user._id,
                course: courseId,
                role: "teacher"
            });

            if (!teacherEnrollment) {
                return res.status(403).json({ message: "You're not assigned to teach this course" });
            }
        }

        const now = new Date();
        const due = new Date(dueDate);

        if (isNaN(due)) return res.status(400).json({ message: "Invalid dueDate" });
        if (due <= now) return res.status(400).json({ message: "dueDate must be in the future" });

        if (Number(maxMarks) <= 0) {
            return res.status(400).json({ message: "maxMarks must be greater than zero" });
        }

        let attachments = [];
        if (req.files?.length > 0) {
            attachments = await Promise.all(
                req.files.map(async (file) => {
                    const uploaded = await uploadToCloudinary(file.buffer, "assignment_attachments");
                    return {
                        public_id: uploaded.public_id,
                        url: uploaded.url,
                        secure_url: uploaded.secure_url,
                        bytes: uploaded.bytes,
                        format: uploaded.format,
                        original_filename: uploaded.original_filename
                    };
                })
            );
        }

        const assignment = await Assignment.create({
            title: cleanTitle,
            description: cleanDescription,
            dueDate: due,
            maxMarks: Number(maxMarks),
            attachments,
            course: courseId,
            createdBy: req.user._id,
            isPublished: false,
            publishedAt: null,
            allowLate: true,
            isActive: true
        });

        await assignment.populate("createdBy", "fullName email");

        return res.status(201).json({
            message: "Assignment created successfully",
            assignment
        });

    } catch (error) {
        console.error("Create Assignment Error:", error);
        return res.status(500).json({ message: "Failed to create assignment" });
    }
};

export {
    createAssignment,

}