

import { Assignment } from "../models/assignment.model.js";
import { Course } from "../models/course.model.js";
import { CourseEnrollment } from "../models/courseEnrollment.model.js";
import { Submission } from "../models/submissions.model.js"
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { client } from "../utils/redisClient.js";

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

        if (req.user.role !== "teacher") {
            return res.status(403).json({ message: "Only teachers can create assignments" });
        }

        const teacherEnrollment = await CourseEnrollment.findOne({
            user: req.user._id,
            course: courseId,
            role: "teacher"
        });

        if (!teacherEnrollment) {
            return res.status(403).json({ message: "You're not assigned to teach this course" });
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

        // Invalidate student assignment caches for all students enrolled in this course
        const enrolledStudents = await CourseEnrollment.find({ course: courseId, role: "student" }).select("user");
        for (const enrollment of enrolledStudents) {
            await client.del(`studentAssignments:${enrollment.user}`);
        }

        // ✅ NEW: Emit real-time event to all students in the course via Socket.IO
        // if (global.io) {
        //     global.io.to(`course-${courseId}`).emit("assignment:created", {
        //         _id: assignment._id,
        //         title: assignment.title,
        //         description: assignment.description,
        //         dueDate: assignment.dueDate,
        //         maxMarks: assignment.maxMarks,
        //         course: assignment.course,
        //         createdBy: assignment.createdBy,
        //         createdAt: assignment.createdAt,
        //         attachments: assignment.attachments
        //     });
        //     console.log(`📢 Assignment broadcast to course-${courseId}`);
        // }

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
        if (description !== undefined) updateDate.description = description?.trim() || ""

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

        // Handle allowLate toggle
        if (req.body.allowLate !== undefined) {
            updateDate.allowLate = req.body.allowLate === "true" || req.body.allowLate === true;
        }

        // Only update attachments if new files are uploaded
        if (req.files?.length > 0) {
            const attachments = await Promise.all(
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
            updateDate.attachments = attachments;
        }

        const updatedAssignment = await Assignment.findByIdAndUpdate(
            assignmentId,
            updateDate,
            { new: true }
        )

        if (global.io) {
            global.io.to(`course-${assignment.course._id}`).emit("assignment:updated", updatedAssignment);
            console.log(`📢 Assignment updated broadcast to course-${assignment.course._id}`);
        }

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

        // const cacheKey = `allAssignments:${req.user.role}:${req.user._id || "none"}`
        // const cached = await client.get(cacheKey)
        // if (cached) {
        //     const parsed = JSON.parse(cached)
        //     return res.status(200).json({
        //         message: "Fetched all the assignments of a course",
        //         count: parsed.length,
        //         assignments: parsed
        //     })
        // }

        const course = await Course.findById(courseId)
            .populate("department", "name code isActive")

        if (!course) return res.status(404).json({ message: "Course not found" })

        let assignments = await Assignment.find({ course: courseId })

        const department = course?.department

        if (assignments.length === 0) {
            return res.status(200).json({
                message: "No active assignments found",
                count: 0,
                assignments: []
            })
        }

        if (req.user.role === "admin") {
            // await client.set(cacheKey, JSON.stringify(assignments), "EX", 300)
            return res.status(200).json({
                message: "Fetched all assignments",
                count: assignments.length,
                assignments
            })
        }

        if (!department.isActive) return res.status(403).json({ message: "Department is not active" })
        assignments = assignments.filter(a => a.isActive)

        if (req.user.role === "teacher") {
            const teacherEnrollment = await CourseEnrollment.findOne({
                user: req.user._id,
                course: course._id,
                role: "teacher"
            })

            if (!teacherEnrollment) return res.status(403).json({ message: "You're not assigned to teach this course" })
            // await client.set(cacheKey, JSON.stringify(assignments), "EX", 300)
            return res.status(200).json({
                message: "Fetched all assignments",
                count: assignments.length,
                assignments
            })
        }

        //student validations
        const studentEnrollment = await CourseEnrollment.findOne({
            user: req.user._id,
            course: courseId,
            role: "student"
        })

        if (!studentEnrollment) return res.status(403).json({ message: "You're not enrolled in this course" })
        assignments = assignments.filter(a => a.isPublished)

        // await client.set(cacheKey, JSON.stringify(assignments), "EX", 300)

        return res.status(200).json({
            message: "Fetched all assignments",
            count: assignments.length,
            assignments
        })
    } catch (error) {
        console.error("Failed to fetch all the assignments", error)
        return res.status(500).json({ message: "Failed to fetch all the assignments" })
    }
}

const getAssignmentByID = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        if (!assignmentId) return res.status(400).json({ message: "Assignment ID is required" })

        const cacheKey = `assignmentById:${assignmentId}:${req.user.role}:${req.user._id || "none"}`
        const cached = await client.get(cacheKey)
        if (cached) {
            return res.status(200).json({
                message: "Assignment fetched successfully",
                assignment: JSON.parse(cached)
            })
        }

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
            await client.set(cacheKey, JSON.stringify(assignment), "EX", 300)
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
            await client.set(cacheKey, JSON.stringify(assignment), "EX", 300)
            return res.status(200).json({
                message: "Assignment fetched successfully",
                assignment
            })
        }

        if (!course?.isPublished) return res.status(403).json({ message: "Course is not published" })
        if (!assignment.isPublished) return res.status(403).json({ message: "Assignment is not published yet!" })

        if (req.user.role === "student") {
            const studentEnrollment = await CourseEnrollment.findOne({
                user: req.user._id,
                course: course._id,
                role: "student"
            })
            if (!studentEnrollment) return res.status(403).json({ message: "You're not enrolled in this course" })
            await client.set(cacheKey, JSON.stringify(assignment), "EX", 300)
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

const togglePublishUnpublishAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        if (!assignmentId) return res.status(400).json({ message: "AssignmentID is required" });

        const assignment = await Assignment.findById(assignmentId)
            .populate({
                path: "course",
                select: "title isPublished",
                populate: { path: "department", select: "name code isActive" }
            })
            .populate("createdBy", "_id fullName role");

        if (!assignment) return res.status(404).json({ message: "Assignment not found" });

        const course = assignment.course;
        const department = course.department;

        // shared checks for everyone
        if (!department?.isActive) return res.status(403).json({ message: "Department is not active" });
        if (!assignment.isActive) return res.status(403).json({ message: "Assignment is deleted" });

        // teacher must be enrolled AND must be the creator
        if (req.user.role === "teacher") {
            const teacherEnrollment = await CourseEnrollment.findOne({
                user: req.user._id,
                course: course._id,
                role: "teacher"
            });
            if (!teacherEnrollment) return res.status(403).json({ message: "You're not assigned to teach this course" });

            const creatorId = assignment.createdBy._id?.toString() ?? assignment.createdBy.toString();
            if (creatorId !== req.user._id.toString()) {
                return res.status(403).json({ message: "Access denied. You're not the creator" });
            }
        } else if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized" });
        }

        const newPublished = !assignment.isPublished;
        assignment.isPublished = newPublished;
        assignment.publishedAt = newPublished ? new Date() : null;
        await assignment.save();

        // invalidate cache for all enrolled students
        const enrolledStudents = await CourseEnrollment.find({
            course: course._id,
            role: "student"
        }).select("user");

        for (const enrollment of enrolledStudents) {
            await client.del(`studentAssignments:${enrollment.user}`);
        }

        // emit the right event:
        // publishing for first time → students don't have it yet → assignment:created
        // unpublishing or re-publishing → students already have it → assignment:updated
        const socketEvent = newPublished ? "assignment:created" : "assignment:updated";

        global.io?.to(`course-${course._id}`).emit(socketEvent, {
            _id: assignment._id,
            title: assignment.title,
            description: assignment.description,
            dueDate: assignment.dueDate,
            maxMarks: assignment.maxMarks,
            course: assignment.course,
            createdBy: assignment.createdBy,
            isPublished: assignment.isPublished,
            publishedAt: assignment.publishedAt,
            attachments: assignment.attachments
        });

        console.log(`📢 Assignment ${newPublished ? "published" : "unpublished"} broadcast to course-${course._id}`);

        return res.status(200).json({
            message: `Assignment ${newPublished ? "published" : "unpublished"} successfully`,
            assignment
        });

    } catch (error) {
        console.error("Toggle assignment publish error:", error);
        return res.status(500).json({ message: "Failed to toggle assignment publish status" });
    }
};

const deleteAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        if (!assignmentId) return res.status(400).json({ message: "AssignmentID is required" })

        const assignment = await Assignment.findById(assignmentId)
            .populate({
                path: "course",
                select: "title courseCode isPublished",
                populate: { path: "department", select: "name code isActive" }
            })
        if (!assignment) return res.status(404).json({ message: "Assignment not found" })

        const department = assignment?.course?.department
        const course = assignment?.course

        if (req.user.role !== "admin" && !department?.isActive) return res.status(403).json({ message: "Department is not active" })

        if (!assignment?.isActive) return res.status(403).json({ message: "Assignment is already deleted" })

        if (req.user.role === "admin") {
            assignment.isActive = false
            assignment.isPublished = false
            assignment.deletedAt = new Date()
            await assignment.save()

            if (global.io) {
                global.io.to(`course-${course._id}`).emit("assignment:deleted", { assignmentId: assignment._id });
                console.log(`📢 Assignment deleted broadcast to course-${course._id}`);
            }

            return res.status(200).json({ message: "Assignment deleted successfully (admin : soft-delete)" })
        }

        if (req.user.role === "teacher") {
            const teacherEnrollment = await CourseEnrollment.findOne({
                user: req.user._id,
                course: assignment?.course?._id,
                role: "teacher"
            })
            if (!teacherEnrollment) return res.status(403).json({ message: "You're not assigned to teach this course" })
            const creatorId = assignment.createdBy._id ? assignment.createdBy._id.toString() : assignment.createdBy.toString();
            if (creatorId !== req.user._id.toString()) {
                return res.status(403).json({ message: "You're not the creator" })
            }
            assignment.isActive = false
            assignment.isPublished = false
            assignment.deletedAt = new Date()
            await assignment.save()

            // Invalidate student assignment caches for enrolled students
            const enrolledStudentsOnDelete = await CourseEnrollment.find({ course: assignment?.course?._id, role: "student" }).select("user");
            for (const enrollment of enrolledStudentsOnDelete) {
                await client.del(`studentAssignments:${enrollment.user}`);
            }

            if (global.io) {
                global.io.to(`course-${course._id}`).emit("assignment:deleted", { assignmentId: assignment._id });
                console.log(`📢 Assignment deleted broadcast to course-${course._id}`);
            }

            return res.status(200).json({ message: "Assignment deleted successfully" })
        }

        return res.status(403).json({ message: "Not authorized!" })
    } catch (error) {
        console.error("Failed to delete assignment", error)
        return res.status(500).json({ message: "Failed to delete assignment" })
    }
}

const getAssignmentSummary = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        if (!assignmentId) return res.status(400).json({ message: "AssignmentID is required" })

        const assignment = await Assignment.findById(assignmentId)
            .populate({
                path: "course",
                select: "title isPublished",
                populate: {
                    path: "department",
                    select: "name isActive"
                }
            })

        if (!assignment) return res.status(404).json({ message: "Assignment not found" })

        const department = assignment?.course?.department;
        const course = assignment?.course;

        if (!["admin", "teacher"].includes(req.user.role)) {
            return res.status(403).json({ message: "Not authorized" });
        }

        if (req.user.role !== "admin") {
            if (!department.isActive) return res.status(403).json({ message: "department is not active" })
            if (!assignment.isActive) return res.status(403).json({ message: "Assignment is deleted" })

            const teacherEnrollment = await CourseEnrollment.findOne({
                user: req.user._id,
                course: course._id,
                role: "teacher"
            })

            if (!teacherEnrollment) return res.status(403).json({ message: "You're not assigned to teach this course" })
        }

        const submissions = await Submission.find({
            assignment: assignmentId,
            status: { $ne: "deleted" }
        })
            .select("status isLate")

        const total = submissions.length
        const graded = submissions.filter(s => s.status === "graded").length;
        const late = submissions.filter(s => s.status === "late").length
        const submitted = submissions.filter(s => s.status === "submitted" || s.status === "late")
        const pending = total - graded

        return res.status(200).json({
            message: "Assignment summary fetched successfully",
            summary: {
                total,
                submitted,
                late,
                graded,
                pending
            }
        })

    } catch (error) {
        console.error("Failed to fetch assignment summary:", error);
        return res.status(500).json({ message: "Failed to fetch assignment summary" });
    }
}

// Get all assignments for the current student across all enrolled courses
const getStudentAssignments = async (req, res) => {
    try {
        const userId = req.user._id;
        // const cacheKey = `studentAssignments:${userId}`;

        // // Check cache
        // const cached = await client.get(cacheKey);
        // if (cached) {
        //     const parsed = JSON.parse(cached);
        //     return res.status(200).json({
        //         message: "Student assignments fetched from cache",
        //         count: parsed.length,
        //         assignments: parsed
        //     });
        // }

        // Get all courses student is enrolled in
        const studentEnrollments = await CourseEnrollment.find({
            user: userId,
            role: "student"
        }).populate({
            path: "course",
            select: "title courseCode isPublished isActive"
        });

        console.log(`🔍 Student ${userId} has ${studentEnrollments.length} enrollments`);
        studentEnrollments.forEach(e => {
            console.log(`   📚 Course: ${e.course?.title} | Published: ${e.course?.isPublished}`);
        });

        if (studentEnrollments.length === 0) {
            return res.status(200).json({
                message: "No enrolled courses found",
                count: 0,
                assignments: []
            });
        }

        // Only include courses that are published and active
        const courseIds = studentEnrollments
            .filter(enrollment => enrollment.course && enrollment.course.isPublished)
            .map(enrollment => enrollment.course._id);

        console.log(`🔍 Published courseIds: ${courseIds}`);

        if (courseIds.length === 0) {
            return res.status(200).json({
                message: "No published courses found",
                count: 0,
                assignments: []
            });
        }

        // Get all published assignments for these courses
        const assignments = await Assignment.find({
            course: { $in: courseIds },
            isPublished: true,
            isActive: true
        })
            .populate({
                path: "course",
                select: "title courseCode"
            })
            .populate({
                path: "createdBy",
                select: "fullName email"
            })
            .sort({ createdAt: -1 });

        console.log(`🔍 Found ${assignments.length} published assignments for student`);

        // // Cache results for 5 minutes
        // await client.set(cacheKey, JSON.stringify(assignments), "EX", 300);

        return res.status(200).json({
            message: "Student assignments fetched successfully",
            count: assignments.length,
            assignments
        });
    } catch (error) {
        console.error("Failed to fetch student assignments:", error);
        return res.status(500).json({
            message: "Failed to fetch student assignments",
            error: error.message
        });
    }
};

export {
    createAssignment,
    updateAssignment,
    getAssignments,
    getStudentAssignments,
    getAssignmentByID,
    togglePublishUnpublishAssignment,
    deleteAssignment,
    getAssignmentSummary
}