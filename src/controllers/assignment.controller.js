import { Assignment } from "../models/assignment.model.js";
import { Course } from "../models/course.model.js";
import { Submission } from "../models/submissions.model.js"

const createAssignment = async (req, res) => {
    try {
        const { title, description, maxMarks, attachments, dueDate, courseId } = req.body;
        if (!title || !courseId || !dueDate) {
            return res.status(400).json({ message: " title, courseId and dueDate is required at minimun" })
        }

        if (req.user.role !== "admin" && req.user.role !== "teacher") {
            return res.status(403).json({ message: "Not authorized : Access denied" })
        }

        const course = await Course.findById(courseId).select("title description")
        if (!course) return res.status(404).json({ message: "Course not found" })

        const assignment = await Assignment.create({
            title: title.trim(),
            description,
            dueDate,
            attachments,
            maxMarks,
            course: course._id,
            createdBy: req.user._id,
            isPublished: false
        })

        await assignment.populate("createdBy", "username fullName email")

        return res.status(201).json({
            message: "Assignment created successfully",
            assignment
        });
    } catch (error) {
        console.error("Failed to create assignment", error.message);
        return res.status(500).json({ message: "Failed to create assignment" });
    }
}

const getAssignmentsByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        if (!courseId) return res.status(400).json({ message: "CourseID is required" })

        const course = await Course.findById(courseId).select("title description")
        if (!course) return res.status(404).json({ message: "Course not found" })

        let query = { course: courseId };
        if (req.user.role === "student") {
            query.isPublished = true;
        }

        const assignments = await Assignment.find(query).sort({ dueDate: 1 });
        if (assignments.length === 0) return res.status(200).json({ message: "No assignments found for this Course" })

        return res.status(200).json({
            message: "Assignments fetched for a specific Course",
            assignments
        })

    } catch (error) {
        console.error("Failed to fetch assigments for course specific", error.message)
        return res.status(500).json({ message: "Failed to fetch assigments for course specific" })
    }
}

const updateAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const { title, description, dueDate, isPublished, maxMarks, attachments } = req.body;

        const assignment = await Assignment.findById(assignmentId)
        if (!assignment) return res.status(404).json({ message: "Assignment not found" })

        //auth check
        if (req.user.role !== "admin" && req.user.role !== "manager" &&
            (req.user.role === "teacher" && assignment.createdBy.toString() !== req.user._id.toString())
        ) return res.status(403).json({ message: "Not authorized to update this assignment" })

        const updatedAssignment = await Assignment.findByIdAndUpdate(
            assignmentId,
            {
                title,
                description,
                dueDate,
                attachments,
                isPublished,
                maxMarks
            }
        )

        return res.status(200).json({
            message: "Assignment updated successfully",
            updatedAssignment
        })
    } catch (error) {
        console.error("Failed to update assignment", error.message)
        return res.status(500).json({ message: "Failed to update assignment" })
    }
}

const deleteAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        if (!assignmentId) return res.status(400).json({ message: "Assignment ID is required" })

        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) return res.status(404).json({ message: "Assignment not found" })

        if (
            req.user.role !== "admin" &&
            req.user.role !== "manager" &&
            !(req.user.role === "teacher" && assignment.createdBy.toString() === req.user._id.toString())
        ) return res.status(403).json({ message: `Your not authorized to delete this Assingnment - Title: ${assignment.title}` })

        const submissionCount = await Submission.countDocuments({ assignment: assignmentId });

        await Submission.deleteMany({ assignment: assignmentId })

        await Course.updateOne(
            { _id: assignment.course },
            { $pull: { assignment: assignmentId } }
        )

        await Assignment.findByIdAndDelete(assignmentId);

        return res.status(200).json({
            message: `Assignment deleted successfully : (Title: ${assignment.title})`,
            deletedAssignment: {
                _id: assignment._id,
                title: assignment.title,
                course: assignment.course
            },
            deletedSubmissions: submissionCount
        })
    } catch (error) {
        console.error("Failed to delete assignment", error.message)
        return res.status(500).json({ message: "Failed to delete assignment" })
    }
}

const togglePublishAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        if (!assignmentId) return res.status(400).json({ message: "Assignment ID is required" })

        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) return res.status(404).json({ message: "Assignment not found" })

        if (req.user.role !== "admin" && req.user.role !== "manager" &&
            !(req.user.role === "teacher" && assignment.createdBy.toString() === req.user._id.toString())
        ) return res.status(403).json({ message: "You're not authorized!" })


        if (new Date(assignment.dueDate) < new Date()) {
            return res.status(400).json({ message: "Cannot publish past due-date assignments" })
        }
        assignment.isPublished = !assignment.isPublished;
        await assignment.save()

        return res.status(200).json({
            message: `Assignment successfully ${assignment.isPublished ? "published" : "unpublished"}`,
            assignment: {
                _id: assignment._id,
                title: assignment.title,
                isPublished: assignment.isPublished
            }
        })
    } catch (error) {
        console.error("Failed to toggle assignment publish status:", error.message);
        return res.status(500).json({ message: "Failed to toggle assignment publish status" });
    }
}

const getAssignmentById = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        if (!assignmentId) return res.status(400).json({ message: "Assignment ID is required" })

        const query = { _id: assignmentId };
        if (req.user.role === "student") {
            query.isPublished = true;
        }

        const assignment = await Assignment.findOne(query)
            .populate("course", "title description")
            .populate("createdBy", "fullName username email role")
            .populate({
                path: "submissions",
                populate: { path: "student", select: "fullName email" }
            }).lean()
        if (!assignment) return res.status(404).json({ message: "Assignment not found" })

        return res.status(200).json({
            message: "Assignment fetched successfully",
            assignment
        })

    } catch (error) {
        console.error("Failed to fetch assignment by ID:", error.message);
        return res.status(500).json({ message: "Failed to fetch assignment by ID" });
    }
}

export {
    createAssignment,
    getAssignmentsByCourse,
    updateAssignment,
    deleteAssignment,
    togglePublishAssignment,
    getAssignmentById
}