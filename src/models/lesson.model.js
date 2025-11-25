import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: String,
    resource: [String],
    module: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Module",
        required: true
    }
}, { timestamps: true })

lessonSchema.index({ module: 1 });


export const Lesson = mongoose.model("Lesson", lessonSchema)