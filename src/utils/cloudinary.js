import { v2 as cloudinary } from "cloudinary"
import streamifier from "streamifier"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

export const uploadToCloudinary = (buffer, folder = "lms_uploads", resourceType = "raw") => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: resourceType
            },
            (error, result) => {
                if(error) reject(error);
                else resolve(result.secure_url)
            }
        )

        streamifier.createReadStream(buffer).pipe(uploadStream)
    })
}

export default cloudinary