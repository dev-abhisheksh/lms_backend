import { Course } from "../models/course.model.js";
import { CourseEnrollment } from "../models/courseEnrollment.model.js";
import { Module } from "../models/module.model.js";
import { Lesson } from "../models/lesson.model.js"
import { client } from "../utils/redisClient.js";
import cloudinary, { uploadToCloudinary } from "../utils/cloudinary.js";

const delRedisCache = async (client, patterns) => {
    const patternArray = Array.isArray(patterns) ? patterns : [patterns]
    let totalDeleted = 0;
    for (const pattern of patternArray) {
        let cursor = "0";
        do {
            const [next, keys] = await client.scan(cursor, "MATCH", pattern, "COUNT", 100)
            if (keys.length > 0) {
                await client.del(keys)
                totalDeleted += keys.length
            }
            cursor = next;
        } while (cursor !== "0")
    }
    console.log("Cleared chahce")
}

const createModule = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { title, description } = req.body;
        if (!courseId || !title) return res.status(400).json({ message: "CourseID & title are required" })

        const course = await Course.findById(courseId)
            .populate("department", "name code isActive")
        if (!course) return res.status(404).json({ message: "Course not found" })

        const department = course?.department;
        if (!["admin", "teacher"].includes(req.user.role)) {
            return res.status(403).json({ message: "Only Admins & Assigned teachers are permitted" })
        }

        if (req.user.role !== "admin") {
            if (!department.isActive) return res.status(403).json({ message: "Department is not active" })

            const teacherEnrollment = await CourseEnrollment.findOne({
                user: req.user._id,
                course: courseId,
                role: "teacher"
            })

            if (!teacherEnrollment) return res.status(403).json({ message: "You're not assigned to teach this course" })
        }

        const module = await Module.create({
            title: title.trim(),
            description: description.trim() || "",
            course: courseId,
        })

        const pattern = `allModules:${courseId}:*`
        await delRedisCache(client, pattern)

        // await delRedisCache(client, [
        //     `allModules:${courseId}:*`,
        //     `module:${moduleId}`
        // ]);

        return res.status(201).json({
            message: "Module created successfully",
            module
        })

    } catch (error) {
        console.error("Failed to create module", error)
        return res.status(500).json({ message: "Failed to create module" })
    }
}

const getAllModules = async (req, res) => {
    try {
        const { courseId } = req.params;
        if (!courseId) return res.status(400).json({ message: "CourseID is required" })

        const cacheKey = `allModules:${courseId}:${req.user.role}`
        const cached = await client.get(cacheKey)
        if (cached) {
            const parsed = JSON.parse(cached)
            return res.status(200).json({
                message: "Fetched all modules",
                count: parsed.length,
                modules: parsed
            })
        }

        let course = await Course.findById(courseId)
            .populate("department", "name code isActive")
        if (!course) return res.status(404).json({ message: "Course not found" })

        const department = course?.department;
        const modules = await Module.find({ course: courseId })

        if (req.user.role === "admin") {
            await client.set(cacheKey, JSON.stringify(modules), "EX", 1000)
            return res.status(200).json({
                message: `Fetched all modules for course: ${course?.title}`,
                count: modules.length,
                modules
            })
        }


        if (!department?.isActive) return res.status(403).json({ message: "Department is not active" })
        modules = modules.filter(m => m.isActive)
        //manager validations
        if (req.user.role === "manager") {
            await client.set(cacheKey, JSON.stringify(modules), "EX", 1000)
            return res.status(200).json({
                message: `Fetched all modules for course: ${course?.title}`,
                count: modules.length,
                modules
            })
        }

        //teacher validations
        if (req.user.role === "teacher") {
            const enrolledTeacher = await CourseEnrollment.findOne({
                user: req.user._id,
                course: courseId,
                role: "teacher"
            })
            if (!enrolledTeacher) return res.status(403).json({ message: "You're not assigned to tech this course" })
            await client.set(cacheKey, JSON.stringify(modules), "EX", 1000)
            return res.status(200).json({
                message: `Fetched all modules for course: ${course?.title}`,
                count: modules.length,
                modules
            })
        }

        //student validations
        if (!course.isPublished) return res.status(403).json({ message: "Course is not Published" })

        const enrolledStudent = await CourseEnrollment.findOne({
            user: req.user._id,
            course: courseId,
            role: "student"
        })

        if (!enrolledStudent) return res.status(403).json({ message: "You're not enrolled in this course" })
        await client.set(cacheKey, JSON.stringify(modules), "EX", 1000)
        return res.status(200).json({
            message: `Fetched all modules for course: ${course?.title}`,
            count: modules.length,
            modules
        })

    } catch (error) {
        console.error("Failed to fetch Modules", error)
        return res.status(500).json({ message: "Failed to fetch Modules" })
    }
}

const getModuleById = async (req, res) => {
    try {
        const { moduleId } = req.params;
        if (!moduleId) return res.status(400).json({ message: "ModuleID is required" })

        const cacheKey = `moduleById:${moduleId}:${req.user.role}`
        const cached = await client.get(cacheKey)
        if (cached) {
            return res.status(200).json({
                message: "Module fetched successfully",
                module: cached
            })
        }

        const module = await Module.findById(moduleId)
            .populate({
                path: "course",
                select: "title isPublished",
                populate: { path: "department", select: "name code isActive" }
            })
        if (!module) return res.status(404).json({ message: "module not found" })

        const course = module?.course;
        const department = module?.course?.department

        if (req.user.role === "admin") {
            await client.set(cacheKey, JSON.stringify(module), "EX", 500)
            return res.status(200).json({
                message: "Module fetched successfully",
                module
            })
        }

        if (!department.isActive) return res.status(403).json({ message: "Department is not active" })
        if (!module.isActive) return res.status(403).json({ message: "Module is deleted" })

        if (req.user.role === "manager") {
            await client.set(cacheKey, JSON.stringify(module), "EX", 500)
            if (!course.isPublished) return res.status(403).json({ message: "Course is not published" })
            return res.status(200).json({
                message: "Module fetched successfully",
                module
            })
        }

        //teacher validations
        if (req.user.role === "teacher") {
            const enrolledTeacher = await CourseEnrollment.findOne({
                user: req.user._id,
                course: course._id,
                role: "teacher"
            })
            if (!enrolledTeacher) return res.status(403).json({ message: "You're not assigned to teach this course" })
            await client.set(cacheKey, JSON.stringify(module), "EX", 500)
            return res.status(200).json({
                message: "Module fetched successfully",
                module
            })
        }

        //student validations
        if (!course.isPublished) return res.status(403).json({ message: "Course is not published" })
        const enrolledStudent = await CourseEnrollment.findOne({
            user: req.user._id,
            course: course._id,
            role: "student"
        })
        if (!enrolledStudent) return res.status(403).json({ message: "You're not enrolled in this course" })
        await client.set(cacheKey, JSON.stringify(module), "EX", 500)
        return res.status(200).json({
            message: "Module fetched successfully",
            module
        })

    } catch (error) {
        console.error("Failed to fetch Module", error)
        return res.status(500).json({ message: "Failed to fetch Module" })
    }
}

const updateModule = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { title, description, isActive } = req.body;
        if (!moduleId) return res.status(400).json({ message: "Module ID is required" })

        if (req.user.role === "admin") {
            const updateFields = {};
            if (title) updateFields.title = title.trim();
            if (description) updateFields.description = description.trim();
            if (typeof isActive === "boolean") updateFields.isActive = isActive;

            const updatedModule = await Module.findByIdAndUpdate(
                moduleId,
                updateFields,
                { new: true }
            )

            if (!updatedModule) return res.status(404).json({ message: "Module not found" })
            const courseId = updatedModule?.course
            const pattern = `allModules:${courseId}:*`
            await delRedisCache(client, pattern)

            return res.status(200).json({
                message: "Module updated successfully",
                module: updatedModule
            })
        }

        const module = await Module.findById(moduleId)
            .populate({
                path: "course",
                select: "title isPublished",
                populate: { path: "department", select: "name code isActive" }
            })
        if (!module) return res.status(404).json({ message: "Module not found" })

        const course = module?.course;
        const department = module?.course?.department;

        if (!department.isActive) return res.status(403).json({ message: "Department is not active" })
        if (!module.isActive) return res.status(403).json({ message: "Module is been deleted" })

        const enrolledTeacher = await CourseEnrollment.findOne({
            user: req.user._id,
            course: course._id,
            role: "teacher"
        })
        if (!enrolledTeacher) return res.status(400).json({ message: "You're not assigned to teach this course" })

        const updateFields = {};
        if (title) updateFields.title = title.trim()
        if (description) updateFields.description = description.trim()

        const updatedModule = await Module.findByIdAndUpdate(
            moduleId,
            updateFields,
            { new: true }
        )

        if (!updatedModule) return res.status(404).json({ message: "Module not found" });

        const pattern = `allModules:${course}:*`
        await delRedisCache(client, pattern)

        return res.status(200).json({
            message: "Module updated successfully",
            module: updatedModule
        })

    } catch (error) {
        console.error("Failed to update module", error)
        return res.status(500).json({ message: "Failed to update module" })
    }
}

const toggleModule = async (req, res) => {
    try {
        const { moduleId } = req.params;
        if (!moduleId) return res.status(400).json({ message: "ModuleID is required" })

        if (req.user.role !== "admin") return res.status(403).json({ message: "Not authorized. Access denied" })

        const module = await Module.findById(moduleId)
        if (!module) return res.status(404).json({ message: "Module not found" })

        module.isActive = !module.isActive
        await module.save()

        return res.status(200).json({
            message: `Module visibility set to ${module.isActive ? "visible" : "not visible"}`,
            module
        })
    } catch (error) {
        console.error("Failed to toggle module", error)
        return res.status(500).json({ message: "Failed to toggle module" })
    }
}

const deleteModule = async (req, res) => {
    try {
        const { moduleId } = req.params;
        if (!moduleId) return res.status(400).json({ message: "ModuleID is required" })

        if (req.user.role !== "admin") return res.status(403).json({ message: "Only Admins are allowed" })

        const module = await Module.findById(moduleId)
        if (!module) return res.status(404).json({ message: "Module not found" })

        const lessons = await Lesson.find({ module: moduleId })
            .populate("course", "title")

        for (const lesson of lessons) {
            if (lesson.files?.length > 0) {
                for (const file of lesson.files) {
                    if (file.public_id) {
                        await cloudinary.uploader.destroy(file.public_id)
                    }
                }
            }
            await Lesson.findByIdAndDelete(lessons._id)
        }

        await Module.findByIdAndDelete(moduleId)

        const courseID = lessons?.course
        const patterns = `allModules:${courseID}:*`
        await delRedisCache(client, patterns)

        return res.status(200).json({ message: "Module and all related lessons deleted permanently" })

    } catch (error) {
        console.error("Failed to delete module", error);
        return res.status(500).json({ message: "Failed to delete module" });
    }
}

export {
    createModule,
    getAllModules,
    getModuleById,
    updateModule,
    toggleModule,
    deleteModule
}