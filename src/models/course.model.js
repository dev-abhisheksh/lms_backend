import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ""
    },
    courseCode: {
        type: String,
        required: true,
        unique: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        required: true
    },
    year: {
        type: String,
        enum: ["FY", "SY", "TY"],
        required: true,
        comment: "Which year this course is for"
    },
    thumbnail: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    modules: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Module"
    }],
    isPublished: {
        type: Boolean,
        default: true
    }
}, { timestamps: true })

courseSchema.index({ department: 1, year: 1 })

export const Course = mongoose.model("Course", courseSchema)