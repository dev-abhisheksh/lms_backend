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
        // if (!course.isActive) return res.status(403).json({ message: "Course is not active" });
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

const updateAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const { title, description, dueDate, maxMarks } = req.body
        if (!assignmentId) return res.status(400).json({ message: "Assignment ID is required" })

        const assignment = await Assignment.findById(assignmentId)
            .populate("createdBy", "role")
            .populate("course", "isPublished")
        if (!assignment) return res.status(404).json({ message: "Assignment not found" })

        //role validations
        if (req.user.role === "admin") {

        } else {
            if (req.user.role === "teacher") {
                const teacherEnrollment = await CourseEnrollment.findOne({
                    user: req.user._id,
                    course: assignment.course._id,
                    role: "teacher"
                })
                if (!teacherEnrollment) return res.status(403).json({ message: "You're not assigned to teach this class" })
            } else {
                return res.status(403).json({ message: "You're not assigned to teach this class" })
            }
        }

        //business rule
        if (!assignment.course.isPublished) return res.status(403).json({ message: "Course not published" })

        const updateDate = {};

        if (title) updateDate.title = title.trim();
        if (description) updateDate.description = description.trim() || ""

        if (dueDate) {
            const newDue = new Date(dueDate)
            if (newDue <= new Date()) {
                return res.status(400).json({ message: "Due Date must be in the future" })
            }
            updateDate.dueDate = newDue;
        }

        if (maxMarks) {
            if (maxMarks <= 0) return res.status(400).json({ message: "maxMarks must be greater then zero" })
            updateDate.maxMarks = maxMarks
        }

        let attachments = {};
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
                    }
                })
            )
        }
        updateDate.attachments = attachments

        const updatedAssignment = await Assignment.findByIdAndUpdate(
            assignmentId,
            updateDate,
            { new: true }
        )

        return res.status(200).json({
            message: "Assignment updated successfully",
            updatedAssignment
        })
    } catch (error) {
        console.error("Failed to update assignment:", error.message);
        return res.status(500).json({ message: "Failed to update assignment" });
    }
}

const getAssignments = async (req, res) => {
    try {
        const { courseId } = req.params;
        if (!courseId) return res.status(400).json({ message: "CourseID is required" })

        const course = await Course.findById(courseId)
            .populate("department", "name code isActive")
        if (!course) return res.status(404).json({ message: "Course not found" })

        let assignments = await Assignment.find({ course: courseId })
        if (assignments.length === 0) {
            return res.status(404).json({
                message: "Course doesnt have any assignments",
                count: 0,
                assignments: []
            })
        }

        if (req.user.role === "admin") {
            return res.status(200).json({
                message: "Fetched all assignments of a course",
                count: assignments.length,
                assignments
            })
        } else {
            if (!course.department.isPublished) return res.status(403).json({ message: "Department is not Published" })
            if (req.user.role === "teacher") {
                const teacherEnrollment = await CourseEnrollment.findOne({
                    user: req.user._id,
                    course: courseId,
                    role: "teacher"
                })
                if (!teacherEnrollment) return res.status(403).json({ message: "You're not assigned to teach this course" })

                return res.status(200).json({
                    message: "Fetched all assignments of a course",
                    count: assignments.length,
                    assignments
                })
            } else if (req.user.role === "student") {
                const studentEnrollment = await CourseEnrollment.findOne({
                    user: req.user._id,
                    course: courseId,
                    role: "student"
                })
                if (!studentEnrollment) return res.status(403).json({ message: "You're not enrolled in this course" })
                assignments = assignments.filter(en => en.isPublished)

                return res.status(200).json({
                    message: "Fetched all assignments of a course",
                    count: assignments.length,
                    assignments
                })
            }

            return res.status(403).json({ message: "Not authorized" })

        }
    } catch (error) {
        console.error("Failed to fetch all assignments of a course")
        return res.status(500).json({ message: "ailed to fetch all assignments of a course" })
    }
}

const getAssignmentByID = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        if (!assignmentId) return res.status(400).json({ message: "Assignment ID is required" })

        let assignment = await Assignment.findById(assignmentId)
            .populate({
                path: "course",
                select: "title courseCode isPublished",
                populate: { path: "department", select: "name isActive" }
            })
        if (!assignment) return res.status(404).json({ message: "Assignment not found" })

        const course = assignment?.course;
        const department = assignment?.course?.department;

        //Roles validation
        if (req.user.role === "admin") {
            return res.status(200).json({
                message: "Assignment fetched successfully",
                assignment
            })
        }

        if (!department?.isActive) return res.status(403).json({ message: "Department is not active" })
        if (!assignment.isActive) return res.status(403).json({ message: "Assignment has been deleted" })

        if (req.user.role === "teacher") {
            const teacherEnrollment = await CourseEnrollment.findOne({
                user: req.user._id,
                course: course._id,
                role: "teacher"
            })
            if (!teacherEnrollment) return res.status(403).json({ message: "You're not assigned to teach this course" })

            return res.status(200).json({
                message: "Assignment fetched successfully",
                assignment
            })
        }

        if (!assignment.isPublished) return res.status(403).json({ message: "Assignment is not published yet!" })

        if (req.user.role === "student") {
            const studentEnrollment = await CourseEnrollment.findOne({
                user: req.user._id,
                course: course._id,
                role: "student"
            })
            if (!studentEnrollment) return res.status(403).json({ message: "You're not enrolled in this course" })

            return res.status(200).json({
                message: "Assignment fetched successfully",
                assignment
            })
        }

        return res.status(403).json({ message: "Not authorized" })

    } catch (error) {
        console.error("Failed to fetch assignment", error)
        return res.status(500).json({ message: "Failed to fetch assignment" })
    }
}

export {
    createAssignment,
    updateAssignment,
    getAssignments,
    getAssignmentByID
}