import { Submission } from "../models/submissions.model.js";
import { Assignment } from "../models/assignment.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { Course } from "../models/course.model.js";
import { CourseEnrollment } from "../models/courseEnrollment.model.js"

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
                .populate("assignment", "title");

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
                .populate("assignment", "title");

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

export {
    createSubmission,
    getAllSubmissions
};
