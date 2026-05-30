import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["manager", "admin", "teacher", "student"],
        default: "student"
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        default: null
    },
    year: {
        type: String,
        default: null,
        comment: "Standard for schools (e.g., 10) or Year for colleges (e.g., FY)"
    },
    section: {
        type: String,
        default: null,
        uppercase: true,
        trim: true,
        comment: "Section for schools (e.g., A, B) or Division for colleges"
    },
    cohortYear: {
        type: Number,
        default: null,
        index: true,
        comment: "Admission year for batch tracking (e.g., 2016)"
    },
    isActive: {
        type: Boolean,
        default: true
    },
    refreshToken: {
        type: String,
        default: null
    },
    lastLogin: {
        type: Date
    }
}, { timestamps: true })

// userSchema.index({ email: 1 }, { unique: true });
// userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ department: 1, year: 1 })

export const User = mongoose.model("User", userSchema)