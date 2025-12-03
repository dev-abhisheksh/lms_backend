import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({
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

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    dueDate: {
        type: Date,
        required: true
    },

    allowLate: {
        type: Boolean,
        default: true
    },

    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },

    module: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Module",
        default: null
    },

    maxMarks: {
        type: Number,
        default: 100,
        min: 1
    },

    isActive: {
        type: Boolean,
        default: true
    },

    attachments: [
        {
            public_id: String,
            url: String,
            secure_url: String,
            bytes: Number,
            format: String,
            original_filename: String
        }
    ],

    isPublished: {
        type: Boolean,
        default: false
    },

    publishedAt: {
        type: Date,
        default: null
    },
    deletedAt: {
        type: Date,
        default: null
    }

}, { timestamps: true });

assignmentSchema.index({ course: 1 });
assignmentSchema.index({ createdBy: 1 });
assignmentSchema.index({ dueDate: 1 });
assignmentSchema.index({ isActive: 1 });

export const Assignment = mongoose.model("Assignment", assignmentSchema);
