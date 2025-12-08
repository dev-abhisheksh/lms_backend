import { Module } from "../models/module.model.js"
import { CourseEnrollment } from "../models/courseEnrollment.model.js"
import cloudinary, { uploadToCloudinary } from "../utils/cloudinary.js";
import { Lesson } from "../models/lesson.model.js";
import { Course } from "../models/course.model.js";

const createLesson = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { title, description, textContent, videoLink } = req.body;
        if (!title || !moduleId) return res.status(400).json({ message: "ModuleID & title are required" })

        const module = await Module.findById(moduleId)
            .populate({
                path: "course",
                select: "title isPublished",
                populate: { path: "department", select: "name code isActive" }
            })
        if (!module) return res.status(404).json({ message: "Module not found" })

        const course = module?.course
        const department = module?.course?.department

        //role cjeck
        if (req.user.role !== "admin") {
            if (!department.isActive) return res.status(403).json({ message: "Department is not active" })

            const enrolledTeacher = await CourseEnrollment.findOne({
                user: req.user._id,
                course: course._id,
                role: "teacher"
            })
            if (!enrolledTeacher) return res.status(403).json({ message: "You're not assigned to teach this course" })
        }

        let filesArray = [];
        if (req.files?.length > 0) {
            filesArray = await Promise.all(
                req.files.map(async (file) => {
                    const upload = await uploadToCloudinary(file.buffer, "lessons");
                    return {
                        public_id: upload.public_id,
                        url: upload.url,
                        secure_url: upload.secure_url,
                        bytes: upload.bytes,
                        format: upload.format,
                        original_filename: upload.original_filename
                    };
                })
            );
        }

        if (!textContent && !videoLink && filesArray.length === 0) {
            return res.status(400).json({
                message: "Lesson must contain textContent, videoLink, or files"
            });
        }

        const existingLessons = await Lesson.countDocuments({ module: moduleId })
        const order = existingLessons + 1;

        const lesson = await Lesson.create({
            title: title.trim(),
            description: description?.trim() || "",
            textContent: textContent || "",
            videoLink: videoLink || "",
            files: filesArray,
            module: moduleId,
            course: course._id,
            createdBy: req.user._id,
            order
        });

        return res.status(201).json({
            message: "Lesson created successfully",
            lesson
        });
    } catch (error) {
        console.error("Failed to create lesson", error);
        return res.status(500).json({ message: "Failed to create lesson" });
    }
}

const getLessonsByModule = async (req, res) => {
    try {
        const { moduleId } = req.params;
        if (!moduleId) return res.status(400).json({ message: "ModuleID is required" })

        const module = await Module.findById(moduleId)
            .populate({
                path: "course",
                select: "title isPublished",
                populate: { path: "department", select: "name code isActive" }
            })
        if (!module) return res.status(404).json({ message: "Module not found" })

        const course = module?.course;
        const department = module?.course?.department

        if (req.user.role === "admin") {
            const lessons = await Lesson.find({ module: moduleId })

            if (lessons.length === 0) return res.status(200).json({
                message: "No lessons"
            })

            return res.status(200).json({
                message: `All lessons fetched for module: ${module.title}`,
                count: lessons.length,
                lessons
            })
        }

        if (!department.isActive) return res.status(403).json({ message: "Department is not active" })
        if (!module.isActive) return res.status(403).json({ message: "Module is deleted" })

        if (req.user.role === "manager") {
            const lessons = await Lesson.find({ module: moduleId })

            if (lessons.length === 0) return res.status(200).json({
                message: "No lessons"
            })

            return res.status(200).json({
                message: `All lessons fetched for module: ${module.title}`,
                count: lessons.length,
                lessons
            })
        }

        if (req.user.role === "teacher") {
            const enrolledTeacher = await CourseEnrollment.findOne({
                user: req.user._id,
                course: course._id,
                role: "teacher"
            })
            if (!enrolledTeacher) return res.status(403).json({ message: "You're not assigned to teach this course" })

            const lessons = await Lesson.find({ module: moduleId })

            if (lessons.length === 0) return res.status(200).json({
                message: "No lessons"
            })

            return res.status(200).json({
                message: `All lessons fetched for module: ${module.title}`,
                count: lessons.length,
                lessons
            })
        }

        if (!course.isPublished) return res.status(403).json({ message: "Course is not published" })

        const enrolledStudent = await CourseEnrollment.findOne({
            user: req.user._id,
            course: course._id,
            role: "student"
        })

        if (!enrolledStudent) return res.status(403).json({ message: "You're not enrolled in this course" })

        const lessons = await Lesson.find({ module: moduleId, isActive: true })

        if (lessons.length === 0) return res.status(200).json({
            message: "No lessons"
        })

        return res.status(200).json({
            message: `All lessons fetched for module: ${module.title}`,
            count: lessons.length,
            lessons
        })

    } catch (error) {
        console.error("Failed to fetch lessons for module", error);
        return res.status(500).json({ message: "Failed to fetch lessons for module" })
    }
}

const getLessonById = async (req, res) => {
    try {
        const { lessonId } = req.params;
        if (!lessonId) return res.status(400).json({ message: "LessonId is required" })

        const lesson = await Lesson.findById(lessonId)
            .populate("module", "title isActive")
            .populate({
                path: "course",
                select: "title isPublished",
                populate: {
                    path: "department",
                    select: "name code isActive"
                }
            })

        if (!lesson) return res.status(404).json({ message: "Lesson not found" })

        const course = lesson?.course
        const module = lesson?.module
        const department = lesson?.course?.department

        if (req.user.role === "admin") {
            return res.status(200).json({
                message: "Fetched lesson bt ID",
                lesson
            })
        }

        if (!department?.isActive) return res.status(403).json({ message: "Department is not active" })
        if (!module?.isActive) return res.status(403).json({ message: "Module is deleted" })

        if (req.user.role === "manager") {
            return res.status(200).json({
                message: "Fetched lesson bt ID",
                lesson
            })
        }

        if (req.user.role === "teacher") {
            const enrolledTeacher = await CourseEnrollment.findOne({
                user: req.user._id,
                course: course._id,
                role: "teacher"
            })
            if (!enrolledTeacher) return res.status(403).json({ message: "You're not assigned to teach this course" })

            return res.status(200).json({
                message: "Fetched lesson bt ID",
                lesson
            })
        }

        if (!course.isPublished) return res.status(403).json({ message: "Course is not published" })
        if (!lesson.isActive) return res.status(403).json({ message: "Lesson is deleted" })

        const enrolledStudent = await CourseEnrollment.findOne({
            user: req.user._id,
            course: course._id,
            role: "student"
        })
        if (!enrolledStudent) return res.status(403).json({ message: "You're not enrolled in this course" })

        return res.status(200).json({
            message: "Fetched lesson bt ID",
            lesson
        })

    } catch (error) {
        console.error("Failed to fetch lesson", error)
        return res.status(500).json({ message: "Failed to fetch lesson" })
    }
}

const updateLesson = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const { title, description, textContent, videoLink } = req.body;
        if (!lessonId) return res.status(400).json({ message: "LessonID is required" })

        if (!["admin", "teacher"].includes(req.user.role)) {
            return res.status(403).json({ message: "Not authorized" })
        }

        const lesson = await Lesson.findById(lessonId)
            .populate("module", "title isActive")
            .populate({
                path: "course",
                select: "title isPublished",
                populate: { path: "department", select: "name code isActive" }
            })
        if (!lesson) return res.status(404).json({ message: "Lesson not found" })

        const course = lesson?.course
        const module = lesson?.module
        const department = lesson?.course?.department

        if (req.user.role !== "admin") {
            if (!department.isActive) return res.status(403).json({ message: "Department is not active" })
            if (!lesson?.isActive) return res.status(403).json({ message: "Lesson is deleted" })

            const enrolledTeacher = await CourseEnrollment.findOne({
                user: req.user._id,
                course: course._id,
                role: "teacher"
            })
            if (!enrolledTeacher) return res.status(403).json({ message: "You're not assigned to teach this course" })
        }
        let updatedFiles = lesson.files;

        if (req.files?.length > 0) {
            //deleting old files
            for (const oldFile of lesson.files) {
                if (oldFile.public_id) {
                    const result = await cloudinary.uploader.destroy(oldFile.public_id, {
                        resource_type: "auto"
                    });
                    console.log("Cloudinary delete:", result);
                }
            }


            updatedFiles = await Promise.all(
                req.files.map(async (file) => {
                    const uploader = await uploadToCloudinary(file.buffer, "lessons");
                    return {
                        public_id: uploader.public_id,
                        url: uploader.url,
                        secure_url: uploader.secure_url,
                        bytes: uploader.bytes,
                        format: uploader.format,
                        original_filename: uploader.original_filename
                    }
                })
            )
        }

        const updateData = {};

        if (title) updateData.title = title.trim();
        if (description) updateData.description = description.trim();
        if (textContent) updateData.textContent = textContent.trim();
        if (videoLink) updateData.videoLink = videoLink.trim();
        updateData.files = updatedFiles;


        const updatedLesson = await Lesson.findByIdAndUpdate(
            lessonId,
            updateData,
            { new: true }
        )

        return res.status(200).json({
            message: "Lesson updated successfully",
            updatedLesson
        })
    } catch (error) {
        console.log("Failed to update lesson", error)
        return res.status(500).json({ message: "Failed to update lesson" })
    }
}

const toggleLesson = async (req, res) => {
    try {
        const { lessonId } = req.params;
        if (!lessonId) return res.status(400).json({ message: "LessonID is required" })

        if (!["admin", "teacher"].includes(req.user.role)) return res.status(403).json({ message: "Only Admins and Assiged teachers are permitted" })

        const lesson = await Lesson.findById(lessonId)
            .populate("module", "title isActive")
            .populate({
                path: "course",
                select: "title isPublished",
                populate: { path: "department", select: "name code isActive" }
            })
        if (!lesson) return res.status(404).json({ message: "Lesson not found" })

        const module = lesson?.module
        const course = lesson?.course
        const department = lesson?.course?.department

        if (req.user.role !== "admin") {
            if (!department?.isActive) return res.status(403).json({ message: "Department is not active" })
            if (!module?.isActive) return res.status(403).json({ message: "Module is been deleted" })

            const enrolledTeacher = await CourseEnrollment.findOne({
                user: req.user._id,
                course: course._id,
                role: "teacher"
            })
            if (!enrolledTeacher) return res.status(403).json({ message: "You're not assigned to teach this course" })
        }

        lesson.isActive = !lesson.isActive
        await lesson.save();

        return res.status(200).json({
            message: `Lesson visibility toggled to ${lesson.isActive ? "Active" : "Not Active"}`,
        })
    } catch (error) {
        console.error("Failed to toggle visibility")
        return res.status(500).json({ message: "Failed to toggle visibility" })
    }
}

const deleteLesson = async (req, res) => {
    try {
        const { lessonId } = req.params;
        if (!lessonId) return res.status(400).json({ message: "LessonIS is required" })

        if (req.user.role !== "admin") return res.status(403).json({ message: "Admins Only" })

        const lesson = await Lesson.findById(lessonId)
        if (!lesson) return res.status(404).json({ message: "Lesson not found" })

        if (lesson.files?.length > 0) {
            for (const file of lesson.files) {
                if (file.public_id) await cloudinary.uploader.destroy(file.public_id,{
                    resource_type: file.resource_type || "video"
                })
            }
        }
        const moduleId = lesson.module;
        await Lesson.findByIdAndDelete(lessonId)

        await Lesson.updateMany(
            { module: moduleId, order: { $gt: lesson.order } },
            { $inc: { order: -1 } }
        );

        return res.status(200).json({
            message: "Lesson deleted successfully"
        })
    } catch (error) {
        console.error("Failed to delete lesson", error)
        return res.status(500).json({ message: "Failed to delete lesson" })
    }
}

export {
    createLesson,
    getLessonsByModule,
    getLessonById,
    updateLesson,
    toggleLesson,
    deleteLesson
}