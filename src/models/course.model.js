import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: String,
    courseCode: {
        type: String,
        required: true,
        unique: true,
        sparse: true
    },
    department: {
        type: String,
        required: true
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
        default: false
    }
}, { timestamps: true })

courseSchema.index({ courseCode: 1 }, { unique: true });
courseSchema.index({ createdBy: 1 });

export const Course = mongoose.model("Course", courseSchema)