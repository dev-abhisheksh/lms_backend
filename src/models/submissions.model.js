import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    assignment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Assignment",
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    grade: {
        type: Number,
        default: null
    },
    feedback: {
        type: String,
        default: ""
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    textAnswer: {
        type: String,
        default: ""
    },
    gradedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    }
}, { timestamps: true })

submissionSchema.index({ assignment: 1 });
submissionSchema.index({ student: 1 });


export const Submission = mongoose.model("Submission", submissionSchema)