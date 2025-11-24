import mongoose from "mongoose";

const courseEnrollmentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    role: {
        type: String,
        enum: ["student", "user", "manager"],
        required: true
    },
    enrolledAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true })

courseEnrollmentSchema.index({ user: 1, course: 1 }, { unique: true })

export const CourseEnrollment = mongoose.model("CourseEnrollment", courseEnrollmentSchema)