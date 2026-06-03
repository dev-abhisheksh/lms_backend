import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema({
    public_id: String,
    url: String,
    secure_url: String,
    bytes: Number,
    format: String,
    original_filename: String,
});

const noteSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ["note", "resource", "link"],
            default: "note",
        },
        content: {
            type: String,
            trim: true,
            default: "",
        },
        lessonName: {
            type: String,
            trim: true,
        },
        chapter: {
            type: String,
            trim: true,
        },
        youtubeUrl: {
            type: String,
            trim: true,
        },
        semester: {
            type: Number,
        },
        attachments: [attachmentSchema],
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
    },
    { timestamps: true }
);

export const Note = mongoose.model("Note", noteSchema);
