import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
    questionText: { type: String, required: true },
    type: { type: String, enum: ["mcq", "obt", "essay"], required: true },
    options: [{ text: String, isCorrect: Boolean }],
    marks: { type: Number, required: true, default: 1 }
});

const testSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        type: {
            type: String,
            enum: ["mcq", "obt", "essay", "mixed"],
            required: true,
        },
        duration: {
            type: Number, // in minutes
            required: true,
        },
        totalQuestions: {
            type: Number,
            required: true,
            default: 0
        },
        totalMarks: {
            type: Number,
            required: true,
        },
        passingMarks: {
            type: Number,
            required: true,
        },
        isPublished: {
            type: Boolean,
            default: false,
        },
        publishedAt: {
            type: Date,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
            required: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        questions: [questionSchema]
    },
    { timestamps: true }
);

export const Test = mongoose.model("Test", testSchema);
