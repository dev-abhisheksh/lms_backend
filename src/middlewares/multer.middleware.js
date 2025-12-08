import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "video/mp4",
    "video/webm",
    "video/mkv",
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain"
];


    if (allowedMimes.includes(file.mimetype)) cb(null, true)
    else cb(new Error("Unsupported file type!"), false)
}

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 20 * 1024 * 1024
    }
})