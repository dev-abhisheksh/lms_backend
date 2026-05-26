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
        enum: ["FY", "SY", "TY", null],
        default: null
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