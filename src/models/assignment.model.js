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
    submissions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Submission"
    }]
}, { timestamps: true })


export const Assignment = mongoose.model("Assignment", assignmentSchema)