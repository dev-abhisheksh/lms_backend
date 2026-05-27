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
        content: {
            type: String,
            trim: true,
            default: "",
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
