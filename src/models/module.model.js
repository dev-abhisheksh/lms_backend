import mongoose from "mongoose";

const moduleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String
    },
    lessons: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson"
    }],
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    }
}, { timestamps: true })


export const Module = mongoose.model("Module", moduleSchema)