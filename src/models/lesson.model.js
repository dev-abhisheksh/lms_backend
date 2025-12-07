const lessonSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        default: ""
    },

    textContent: {
        type: String,
        default: ""
    },

    videoLink: {
        type: String,
        default: ""
    },

    files: [
        {
            public_id: String,
            url: String,
            secure_url: String,
            bytes: Number,
            format: String,
            original_filename: String
        }
    ],

    order: {
        type: Number,
        default: 1
    },

    isActive: {
        type: Boolean,
        default: true
    },

    module: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Module",
        required: true
    },

    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }

}, { timestamps: true });

lessonSchema.index({ module: 1 });
lessonSchema.index({ course: 1 });
lessonSchema.index({ isActive: 1 });

export const Lesson = mongoose.model("Lesson", lessonSchema);
