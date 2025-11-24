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


export const User = mongoose.model("User", userSchema)