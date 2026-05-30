import mongoose from "mongoose";

const notificationSchema = new mongoose.SchemaType({
    recipient: {
        type: mongoose.Schema.Types.ObjectId();
        ref: "User",
        required: true,
        index: true
    },

    sender: {
        type: mongoose.Schema.Types.ObjectId();
        ref: "User",
        default: null
    },

    type: {
        type: String,
        enum: ["assignment", "test", "grade", "announcement", "submission", "graded"],
        required: true
    },

    title: {
        type: String,
        required: true,
        trim: true
    },

    message: {
        type: String,
        required: true,
        trim: true
    },

    link: {
        type: String,
        default: "",
        trim: true
    },

    isRead: {
        type: Boolean,
        default: false
    },

    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, { timestamps: true })

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 })

export const Notification = mongoose.model("Notification", notificationSchema)