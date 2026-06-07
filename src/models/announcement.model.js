import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
        index: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    attachments: [
        {
            public_id: String,
            url: String,
            secure_url: String,
            format: String,
            original_filename: String
        }
    ],
    isPinned: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export const Announcement = mongoose.model("Announcement", announcementSchema);
