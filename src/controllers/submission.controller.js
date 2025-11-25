import { Submission } from "../models/submissions.model.js";
import { Assignment } from "../models/assignment.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const createSubmission = async (req, res) => {
    try {
        const { assignmentId } = req.params;

        // Role validation
        if (req.user.role !== "student") {
            return res.status(403).json({ message: "Only students are allowed to submit" });
        }

        //Validate assignment
        const assignment = await Assignment.findById(assignmentId)
            .select("title dueDate isPublished");
        if (!assignment) return res.status(404).json({ message: "Assignment not found" });

        if (!assignment.isPublished)
            return res.status(400).json({ message: "Assignment is not yet published" });

        const now = new Date();
        if (now > assignment.dueDate)
            return res.status(400).json({ message: "Deadline has passed. You cannot submit now." });

        //  Check duplicate submission
        const existingSubmission = await Submission.findOne({
            assignment: assignmentId,
            student: req.user._id,
        });
        if (existingSubmission)
            return res.status(409).json({ message: "You've already submitted this assignment" });

        // Handle file upload or text submission
        let fileUrl = null;
        if (req.file) {
            const resourceType = req.file.mimetype.startsWith("image/") ? "image" : "raw";
            try {
                fileUrl = await uploadToCloudinary(req.file.buffer, "submissions", resourceType);
            } catch (uploadErr) {
                console.error("Cloudinary upload failed:", uploadErr.message);
                return res.status(500).json({ message: "File upload failed" });
            }
        } else if (!req.body.textAnswer) {
            return res.status(400).json({ message: "Please provide either a file or a text answer." });
        }

        //  Create submission
        const submission = await Submission.create({
            student: req.user._id,
            assignment: assignmentId,
            fileUrl,
            textAnswer: req.body.textAnswer || "",
            submittedAt: now,
        });

        //  Link submission to assignment
        await Assignment.findByIdAndUpdate(assignmentId, {
            $push: { submissions: submission._id },
        });

        //  Enrich submission data for response
        const populatedSubmission = await submission.populate({
            path: "assignment",
            select: "title dueDate",
        });

        return res.status(201).json({
            message: "Submission uploaded successfully",
            submission: populatedSubmission,
        });
    } catch (error) {
        console.error("[Submission Error]", error.message);
        return res.status(500).json({ message: "Failed to create submission" });
    }
};



export {
    createSubmission
};
