import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    maxMarks: {
        type: String,
        default: 100
    },
    attachments: [{
        type: String
    }],
    submissions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Submission"
    }],
    isPublished: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

assignmentSchema.index({ course: 1 });
assignmentSchema.index({ createdBy: 1 });
assignmentSchema.index({ dueDate: 1 });


export const Assignment = mongoose.model("Assignment", assignmentSchema)