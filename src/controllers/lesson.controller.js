import { Module } from "../models/module.model.js"
import { CourseEnrollment } from "../models/courseEnrollment.model.js"
import { uploadToCloudinary } from "../utils/cloudinary.js";
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

export {
    createLesson,
    getLessonsByModule
}