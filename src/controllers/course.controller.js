import { Course } from "../models/course.model.js";
import { CourseEnrollment } from "../models/courseEnrollment.model.js";
import { Department } from "../models/department.model.js";
import { Module } from "../models/module.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

//create COURSE
const createCourse = async (req, res) => {
    try {
        const { department } = req.params
        const { title, description, courseCode, thumbnail } = req.body;
        if (!title || !description || !courseCode || !department) return res.status(400).json({ message: "Title, courseCode & description fields are required" })

        //role check
        if (req.user.role !== "admin") return res.status(403).json({ message: "Not authorized!" })

        //courseCode dublication check
        const existing = await Course.findOne({ courseCode })
        if (existing) return res.status(409).json({ message: "Course with the courseCode already exists" })

        let thumbnailMeta = null;
        if (req.file) {
            const uploaded = await uploadToCloudinary(req.file.buffer, "course_thumbnails")

            thumbnailMeta = {
                public_id: uploaded.public_id,
                url: uploaded.url,
                secure_url: uploaded.secure_url,
                bytes: uploaded.bytes,
                format: uploaded.format,
                original_filename: uploaded.original_filename
            }
        }

        //checking if the department exists
        const existingDepartment = await Department.findById(department).select("name code")
        if (!department) return res.status(404).json({ message: "Department doesnt exists" })

        const course = await Course.create({
            title: title.trim(),
            description: description.trim(),
            courseCode: courseCode.trim(),
            department: existingDepartment,
            createdBy: req.user._id,
            thumbnail: thumbnailMeta,
            isPublished: true
        })

        return res.status(201).json({ message: "Course created successfully", course })
    } catch (error) {
        console.error("Failed to create course", error.message)
        return res.status(500).json({ message: "Failed to create course" })
    }
}

//get ALL COURSES
const getAllCourses = async (req, res) => {
    try {
        const courses = await Course.find()
            .populate("createdBy", "fullName email role")
            .sort({ createdAt: -1 })
        return res.status(200).json({
            message: "Fetched all courses",
            courses
        })
    } catch (error) {
        console.error("Failed to fetch all course", error.message)
        return res.status(500).json({ message: "Failed to fetch all course" })
    }
}

const getMyCourse = async (req, res) => {
    try {
        const { userId } = req.user._id;
        if (!userId) {
            return res.status(400).json({ message: "UserId not provided" })
        }

        const myCourses = await Course.find({ createdBy: userId })
            .sort({ createdAt: -1 })

        return res.status(200).json({
            message: "Fetched yr created courses",
            count: myCourses.length,
            courses: myCourses
        })
    } catch (error) {
        console.error("Failed to fetch teacher's courses:", error.message);
        return res.status(500).json({ message: "Failed to fetch your courses" });
    }
}

const getCourseById = async (req, res) => {
    try {
        const { id } = req.params;

        const course = await Course.findById(id)
            .populate({
                path: "modules",
                populate: { path: "lessons" }
            })
            .populate("createdBy", "fullName email role")

        if (!course) {
            return res.status(404).json({ message: "Course not found" })
        }

        return res.status(200).json({
            message: "Fetched course successfully",
            course
        })
    } catch (error) {
        console.error("Failed to fetch course:", error.message);
        return res.status(500).json({ message: "Failed to fetch course" });
    }
}

const updateCourse = async (req, res) => {
    try {
        const { title, description, department, thumbnail } = req.body;
        const { id } = req.params;

        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({ message: "Course not found" })
        }

        if (req.user.role === "admin") {

        } else {
            const isAuthorizedTeacher = await CourseEnrollment.findOne({
                user: req.user._id,
                course: id,
                role: "teacher"
            })

            if (course.createdBy.toString() != req.user._id.toString() && !isAuthorizedTeacher) {
                return res.status(403).json({ message: "You are not allowed to edit this course" });
            }
        }

        if (title) course.title = title.trim();
        if (description) course.description = description.trim();
        if (thumbnail) course.thumbnail = thumbnail;
        if (department) course.department = department;

        await course.save();
        return res.status(200).json({
            message: "Course updated succcessfully",
            course
        })
    } catch (error) {
        console.error("Failed to update course:", error.message);
        return res.status(500).json({ message: "Failed to update course" });
    }
}

const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.role !== "admin" && req.user.role !== "manager") {
            return res.status(403).json({ message: "Only admins and managers can delete courses" })
        }

        const deleted = await Course.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: "Course not found" });

        return res.status(200).json({ message: "Course deleted successfully" });
    } catch (error) {
        console.error("Failed to delete course:", error.message);
        return res.status(500).json({ message: "Failed to delete course" });
    }
}

const publishCourse = async (req, res) => {
    try {
        const { id } = req.params;

        const course = await Course.findById(id);
        if (!course) return res.status(404).json({ message: "Course not found" })

        if (course.createdBy.toString() !== req.user._id.toString() && req.user._id !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        course.isPublished = !course.isPublished
        await course.save();

        return res.status(200).json({
            message: `Course ${course.isPublished ? "published" : "unpublished"} successfully`,
            isPublished: course.isPublished
        });

    } catch (error) {
        console.error("Failed to toggle course publish status:", error.message);
        return res.status(500).json({ message: "Failed to toggle course status" });
    }
}

export {
    createCourse,
    getAllCourses,
    getMyCourse,
    getCourseById,
    updateCourse,
    deleteCourse,
    publishCourse
}