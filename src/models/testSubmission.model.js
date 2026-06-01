import mongoose from "mongoose";

const testSubmissionSchema = new mongoose.Schema(
    {
        test: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Test",
            required: true,
        },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        answers: [
            {
                questionId: mongoose.Schema.Types.ObjectId,
                selectedOption: Number, // Index of option
                textAnswer: String,    // For essay
                isCorrect: Boolean,
                marksObtained: Number
            }
        ],
        score: {
            type: Number,
            required: true,
            default: 0
        },
        totalMarks: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ["submitted", "graded"],
            default: "submitted"
        },
        submittedAt: {
            type: Date,
            default: Date.now
        },
        feedback: {
            type: String,
            trim: true
        }
    },
    { timestamps: true }
);

export const TestSubmission = mongoose.model("TestSubmission", testSubmissionSchema);
