import { Submission } from "../models/submissions.model.js";
import { Assignment } from "../models/assignment.model.js";
import cloudinary, { uploadToCloudinary } from "../utils/cloudinary.js";
import { Course } from "../models/course.model.js";
import { CourseEnrollment } from "../models/courseEnrollment.model.js"
import { populate } from "dotenv";

const createSubmission = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        if (!assignmentId) return res.status(400).json({ message: "AssignmentID is required" })

        if (req.user.role !== "student") {
            return res.status(403).json({ message: "Only students are allowed to submit" })
        }

        const assignment = await Assignment.findById(assignmentId)
            .populate({
                path: "course",
                select: "title isPublished",
                populate: { path: "department", select: "name isActive" }
            })
            .select("title isPublished isActive dueDate allowLate")
        if (!assignment) return res.status(404).json({ message: "Assignment not found" })

        const course = assignment?.course;
        const department = assignment?.course?.department

        if (!department?.isActive) return res.status(403).json({ message: "Department is not active" })
        if (!course.isPublished) return res.status(403).json({ message: "Course is not published" })
        if (!assignment.isActive) return res.status(403).json({ message: "Cant make submission to a deleted assignment" })
        if (!assignment.isPublished) return res.status(403).json({ message: "Assignment is not published yet" })

        const studentEnrollment = await CourseEnrollment.findOne({
            user: req.user._id,
            course: course._id,
            role: "student"
        })
            .populate("user", "fullname username")
        if (!studentEnrollment) return res.status(403).json({ message: "You're not enrolled in this course" })

        const existingSubmission = await Submission.findOne({
            student: req.user._id,
            assignment: assignmentId,
            status: { $ne: "deleted" }
        })

        if (existingSubmission) return res.status(409).json({ message: "You've already submitted" })

        const now = new Date();
        const isLate = now > assignment.dueDate;
        const status = isLate ? "late" : "submitted"

        //file handling
        let filesArray = [];
        if (req.files?.length > 0) {
            filesArray = await Promise.all(
                req.files.map(async (file) => {
                    const uploader = await uploadToCloudinary(file.buffer, "submissions");
                    return {
                        public_id: uploader.public_id,
                        url: uploader.url,
                        secure_url: uploader.secure_url,
                        bytes: uploader.bytes,
                        format: uploader.format,
                        original_filename: uploader.original_filename
                    }
                })
            )
        }


        if (filesArray.length === 0 && !req.body.textAnswer) {
            return res.status(400).json({ message: "Provide either a file or text answer" });
        }

        const submission = await Submission.create({
            student: req.user._id,
            assignment: assignmentId,
            textAnswer: req.body.textAnswer || "",
            files: filesArray,
            submittedAt: now,
            isLate,
            status
        })


        //linking submission to the assinment
        // await Assignment.findByIdAndUpdate(
        //     assignmentId,
        //     { $push: { submissions: submission._id } }
        // )

        return res.status(201).json({
            message: isLate
                ? "Submission uploaded (late)"
                : "Submission uploaded successfully",
            submission
        });

    } catch (error) {
        console.error("Submission Error:", error);
        return res.status(500).json({ message: "Failed to create submission" });
    }
};

const getAllSubmissions = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        if (!assignmentId) return res.status(400).json({ message: "AssignmentID is required" })

        if (!["admin", "teacher"].includes(req.user.role)) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const assignment = await Assignment.findById(assignmentId)
            .populate({
                path: "course",
                select: "title isPublished ",
                populate: { path: "department", select: "name code isActive" }
            })
            .select("title isPublished isActive")
        if (!assignment) return res.status(404).json({ message: "Assignment not found" })

        if (req.user.role === "admin") {
            const submissions = await Submission.find({
                assignment: assignmentId,
                status: { $ne: "deleted" }
            })
                .populate("student", "fullName username email")
                .populate("assignment", "title maxMarks");

            return res.status(200).json({
                message: `Fetched all the submissions for ${assignment?.title}`,
                count: submissions.length,
                submissions
            })
        }

        const course = assignment?.course;
        const department = assignment?.course?.department;

        if (!department?.isActive) return res.status(403).json({ message: "Department is not active" })
        if (!course.isPublished) return res.status(403).json({ message: "Course is not published" })
        if (!assignment.isActive) return res.status(403).json({ message: "Assignment is deleted" })

        if (req.user.role === "teacher") {
            const teacherEnrollment = await CourseEnrollment.findOne({
                user: req.user._id,
                course: course._id,
                role: "teacher"
            })
            if (!teacherEnrollment) return res.status(403).json({ message: "You're not assigned to teach this course" })

            const submissions = await Submission.find({
                assignment: assignmentId,
                status: { $ne: "deleted" }
            })
                .populate("student", "fullName username email")
                .populate("assignment", "title maxMarks");

            return res.status(200).json({
                message: `Fetched all the submissions for ${assignment?.title}`,
                count: submissions.length,
                submissions
            })
        }
    } catch (error) {
        console.error("Failed to fetch all the submissions")
        return res.status(500).json("Failed to fetch all the submissions")
    }
}

const gradingSubissions = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const { grade, feedback } = req.body;
        if (!submissionId || grade == null) return res.status(400).json({ message: "SubmissionID and Grades are required" })

        const submission = await Submission.findById(submissionId)
            .populate({
                path: "assignment",
                select: "title isActive isPublished maxMarks",
                populate: {
                    path: "course", select: "title isPublished",
                    populate: { path: "department", select: "name code isActive" }
                }
            })
        if (!submission) return res.status(404).json({ message: "Submission not found" })

        const department = submission?.assignment?.course?.department;
        const course = submission?.assignment?.course;
        const assignment = submission?.assignment;

        if (!assignment.isActive) return res.status(400).json({ message: "Cannot grade. Assignment is deleted" })
        if (submission.status === "deleted") return res.status(400).json({ message: "Cannot grade deleted submission" })
        if (isNaN(grade)) return res.status(400).json({ message: "Grade must be Number" })
        if (grade < 0) return res.status(400).json({ message: "Grade should not be below zero" })
        if (grade > assignment.maxMarks) return res.status(400).json({ message: `Grade-${grade} must not be greater than maxMarks-${assignment.maxMarks}` })

        if (req.user.role === "admin") {
            const gradeSubmission = await Submission.findByIdAndUpdate(
                submissionId,
                {
                    grade: grade,
                    feedback: feedback || "",
                    gradedAt: new Date(),
                    gradedBy: req.user._id,
                    status: "graded"
                },
                { new: true }
            )

            return res.status(200).json({
                message: "Submission graded successfully",
                grading: gradeSubmission
            })
        }

        if (!department.isActive) return res.status(403).json({ message: "Department is not active" })
        if (!course.isPublished) return res.status(403).json({ message: "Course is not published" })
        if (!assignment.isPublished) return res.status(403).json({ message: "Assignmet is not yet published" })

        if (req.user.role === "teacher") {
            const teacherEnrollment = await CourseEnrollment.findOne({
                user: req.user._id,
                course: course._id,
                role: "teacher"
            })
            if (!teacherEnrollment) return res.status(403).json({ message: "You're not assigned to teach this course" })

            const gradeSubmission = await Submission.findByIdAndUpdate(
                submissionId,
                {
                    grade: grade,
                    feedback: feedback || "",
                    gradedAt: new Date(),
                    gradedBy: req.user._id,
                    status: "graded"
                },
                { new: true }
            )

            return res.status(200).json({
                message: "Submission graded successfully",
                grading: gradeSubmission
            })
        }

        return res.status(403).json({ message: "Not authorized" })

    } catch (error) {
        console.error("Failed to grade submission", error)
        return res.status(500).json({ message: "Failed to grade submission" })
    }
}

const deleteSubmission = async (req, res) => {
    try {
        const { submissionId } = req.params;
        if (!submissionId) return res.status(400).json({ message: "SubmissionID is required" });

        const submission = await Submission.findById(submissionId);
        if (!submission) return res.status(404).json({ message: "Submission not found" });

        // Already deleted
        if (submission.status === "deleted") {
            return res.status(400).json({ message: "Submission is already deleted" });
        }

        // Cannot delete graded submissions
        if (submission.status === "graded") {
            return res.status(403).json({ message: "Cannot delete graded submission" });
        }

        // Auth check
        if (
            req.user.role !== "admin" &&
            submission.student.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({ message: "Not authorized" });
        }

        // Delete cloudinary files
        if (submission.files?.length > 0) {
            for (const file of submission.files) {
                if (file.public_id) await cloudinary.uploader.destroy(file.public_id);
            }
        }

        // Soft delete
        submission.status = "deleted";
        submission.deletedAt = new Date();
        await submission.save();

        return res.status(200).json({ message: "Submission deleted successfully" });

    } catch (error) {
        console.error("Failed to delete submission", error);
        return res.status(500).json({ message: "Failed to delete submission" });
    }
};

const mySubmissions = async (req, res) => {
    try {
        if (req.user.role !== "student") {
            return res.status(403).json({ message: "Only students can see their submissions" })
        }

        const { courseId, assignmentId } = req.query;

        const query = {
            student: req.user._id,
            status: { $ne: "deleted" }
        }

        let submissions = await Submission.find(query)
            .populate({
                path: "assignment",
                select: "title dueDate isActive isPublished course",
                populate: {
                    path: "course",
                    select: "title isPublished department",
                    populate: { path: "department", select: "name code isActive" }
                }
            })
            .sort({ createdAt: -1 })

        if (courseId) {
            submissions = submissions.filter((s) => s.assignment?.course._id === courseId)
        }

        return res.status(200).json({
            message: "Fetched your submissions",
            count: submissions.length,
            submissions
        });
    } catch (error) {
        console.error("Failed to fetch submissions:", error);
        return res.status(500).json({ message: "Failed to fetch submissions" });
    }
}

const getSingleSubmission = async (req, res) => {
    try {
        if (!["admin", "teacher"].includes(req.user.role)) {
            return res.status(403).json({ message: "Only admins and teachers are allowed" });
        }

        const { submissionId } = req.params;
        if (!submissionId) return res.status(400).json({ message: "SubmissionID is required" });

        const submission = await Submission.findById(submissionId)
            .populate({
                path: "assignment",
                select: "title isActive isPublished course",
                populate: {
                    path: "course",
                    select: "title isPublished department",
                    populate: { path: "department", select: "name code isActive" }
                }
            });

        if (!submission) return res.status(404).json({ message: "Submission not found" });

        const assignment = submission.assignment;
        const course = assignment.course;
        const department = course.department;

        if (!assignment.isActive)
            return res.status(400).json({ message: "Assignment is deleted" });

        // Admin bypasses all checks
        if (req.user.role === "admin") {
            return res.status(200).json({ message: "Submission fetched successfully", submission });
        }

        // Teacher checks
        if (!department.isActive)
            return res.status(403).json({ message: "Department is not active" });

        if (!course.isPublished)
            return res.status(403).json({ message: "Course is not published" });

        if (!assignment.isPublished)
            return res.status(403).json({ message: "Assignment is not published" });

        const teacherEnrollment = await CourseEnrollment.findOne({
            user: req.user._id,
            course: course._id,
            role: "teacher"
        });

        if (!teacherEnrollment)
            return res.status(403).json({ message: "You're not assigned to this course" });

        return res.status(200).json({
            message: "Submission fetched successfully",
            submission
        });

    } catch (error) {
        console.error("Failed to fetch submission:", error);
        return res.status(500).json({ message: "Failed to fetch submission" });
    }
};

const updateSubmission = async (req, res) => {
    try {
        if (req.user.role !== "student")
            return res.status(403).json({ message: "Only students can update submissions" });

        const { submissionId } = req.params;
        if (!submissionId) return res.status(400).json({ message: "submissionId is required" });

        const submission = await Submission.findById(submissionId)
            .populate({
                path: "assignment",
                select: "title isActive isPublished dueDate course",
                populate: {
                    path: "course",
                    select: "title isPublished department",
                    populate: { path: "department", select: "name code isActive" }
                }
            });

        if (!submission) return res.status(404).json({ message: "Submission not found" });

        const assignment = submission.assignment;
        const course = assignment.course;
        const department = course.department;
        s
        if (!department.isActive) return res.status(403).json({ message: "Department is not active" });
        if (!course.isPublished) return res.status(403).json({ message: "Course is not published" });
        if (!assignment.isActive) return res.status(403).json({ message: "Assignment is deleted" });

        const now = new Date();
        if (now >= new Date(assignment.dueDate))
            return res.status(400).json({ message: "Due date passed. Cannot update submission." });

        if (submission.status === "deleted")
            return res.status(400).json({ message: "Submission is deleted" });

        if (submission.status === "graded")
            return res.status(403).json({ message: "Submission is already graded" });

        const enrollment = await CourseEnrollment.findOne({
            user: req.user._id,
            course: course._id,
            role: "student"
        });

        if (!enrollment)
            return res.status(403).json({ message: "You're not enrolled in this course" });

        // Handle file replacement only if new files provided
        let updatedFiles = submission.files;

        if (req.files?.length > 0) {
            // delete old files
            for (const file of submission.files) {
                if (file.public_id) await cloudinary.uploader.destroy(file.public_id);
            }

            // upload new files
            updatedFiles = await Promise.all(
                req.files.map(async (file) => {
                    const uploaded = await uploadToCloudinary(file.buffer, "submissions");
                    return {
                        public_id: uploaded.public_id,
                        secure_url: uploaded.secure_url,
                        url: uploaded.url,
                        bytes: uploaded.bytes,
                        format: uploaded.format,
                        original_filename: uploaded.original_filename
                    };
                })
            );
        }

        // update submission
        const updatedSubmission = await Submission.findByIdAndUpdate(
            submissionId,
            {
                files: updatedFiles,
                textAnswer: req.body.textAnswer || submission.textAnswer
            },
            { new: true }
        );

        return res.status(200).json({
            message: "Submission updated successfully",
            submission: updatedSubmission
        });

    } catch (error) {
        console.error("Failed to update submission:", error);
        return res.status(500).json({ message: "Failed to update submission" });
    }
};

const getSubmissionStatusForAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        if (!assignmentId) return res.status(400).json({ message: "AssignmentID is required" })

        const assignment = await Assignment.findById(assignmentId)
            .populate({
                path: "course",
                select: "title isPublished",
                populate: { path: "department", select: "name isActive" }
            })

        if (!assignment) return res.status(404).json({ message: "Assignment not found" })

        const course = assignment?.course;
        const department = assignment?.course?.department;

        if (!["admin", "teacher"].includes(req.user.role)) {
            return res.status(403).json({ message: "Only admins and assigned teachers are permitted" })
        }

        if (req.user.role !== "admin") {
            if (!department.isActive) return res.status(403).json({ message: "Department is not active" })
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
        }).select("student", "fullName username email")

        const enrolledStudent = await CourseEnrollment.find({
            course: courseId,
            role: "student"
        }).populate("user", "fullName username email")

        const result = enrolledStudent.map((enrolled) => {
            const sub = submissions.find(
                (s) => s.student._id.toString() === enrolled.user._id.toString())

            return {
                student: enrolled.user,
                status: sub ? sub.status : "not_submitted",
                submittedAt: sub?.submittedAt || null,
                isLate: sub?.isLate || false,
                grade: sub?.grade || null
            }
        })

        return res.status(200).json({
            message: "Submission status fetched successfully",
            count: result.length,
            assignment: assignment.title,
            results: result
        });

    } catch (error) {
        console.error("Failed to fetch submission status", error);
        return res.status(500).json({ message: "Failed to fetch submission status" });
    }
}


export {
    createSubmission,
    getAllSubmissions,
    gradingSubissions,
    deleteSubmission,
    mySubmissions,
    getSingleSubmission,
    updateSubmission
};
