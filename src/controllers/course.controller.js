import { Course } from "../models/course.model.js";
import { CourseEnrollment } from "../models/courseEnrollment.model.js";
import { Department } from "../models/department.model.js";
import { Module } from "../models/module.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

//create COURSE
const createCourse = async (req, res) => {
    try {
        const { departmentId } = req.params
        const { title, description, courseCode, thumbnail } = req.body;
        if (!title || !description || !courseCode || !departmentId) return res.status(400).json({ message: "Title, courseCode & description fields are required" })

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
        const existingDepartment = await Department.findById(departmentId).select("name code")
        if (!departmentId) return res.status(404).json({ message: "Department doesnt exists" })

        const course = await Course.create({
            title: title.trim(),
            description: description.trim(),
            courseCode: courseCode.trim(),
            department: existingDepartment._id,
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
        const { departmentId } = req.query;
        const { search, page = 1, limit = 20 } = req.query;

        let department = null;
        if (departmentId) {
            department = await Department.findById(departmentId)
            if (!department) return res.status(404).json({ message: "Department not found" })

            if (req.user.role !== "admin" && !department.isActive) {
                return res.status(403).json({ message: "Not authorized to view courses from this department" })
            }
        }

        const query = {};
        if (departmentId) query.department = departmentId;

        if (req.user.role !== "admin") {
            const activeDepartments = await Department.find({ isActive: true }).select("_id");
            const activeDepartIDS = activeDepartments.map(e => e._id)
            query.department = departmentId ? departmentId : { $in: activeDepartIDS }

            if (req.user.role === "teacher") {
                const teacherEnrollments = await CourseEnrollment.find({
                    user: req.user._id,
                    role: "teacher"
                }).select("course")
                const teacherCourseIds = teacherEnrollments.map(e => e.course)

                query.$or = [
                    { isPublished: true },
                    { _id: { $in: teacherCourseIds } }
                ];
            } else {
                query.isPublished = true
            }
        }

        if (search && search.trim()) {
            const re = new RegExp(search.trim(), "i");
            query.$and = query.$and || [];
            query.$and.push({ $or: [{ title: re }, { courseCode: re }] })
        }

        const skip = (Math.max(1, Number(page)) - 1) * Math.min(100, Number(limit))
        const courses = await Course.find(query)
            .populate("createdBy", "fullName email username")
            .populate("department", "name code isActive")
            .sort({ title: 1 })
            .skip(skip)
            .limit(Math.min(100, Number(limit)))

        return res.status(200).json({
            message: "Courses fetched successfully",
            meta: { page: Number(page), limit: Number(limit), count: courses.length },
            courses
        });
    } catch (error) {
        console.error("Get All Courses Error:", error);
        return res.status(500).json({ message: "Failed to fetch courses" });
    }
}

const getMyCourse = async (req, res) => {
    try {
        const { departmentId, courseId } = req.query;
        const filter = { user: req.user._id };

        if (courseId) filter.course = courseId;

        let enrollments = await CourseEnrollment.find(filter)
            .populate({
                path: "course",
                select: "title courseCode department isPublished",
                populate: {
                    path: "department",
                    select: "name code isActive"
                }
            })
            .sort({ createdAt: -1 });

        if (req.user.role !== "admin") {

            if (departmentId) {
                enrollments = enrollments.filter(
                    en => en.course?.department?._id.toString() === departmentId
                );
            }

            enrollments = enrollments.filter(
                en => en.course?.department?.isActive === true
            );

            if (req.user.role === "student") {
                enrollments = enrollments.filter(
                    en => en.course?.isPublished === true
                );
            }
        }

        return res.status(200).json({
            message: "Fetched your courses successfully",
            count: enrollments.length,
            courses: enrollments
        });

    } catch (error) {
        console.error("Failed to fetch your courses:", error);
        return res.status(500).json({ message: "Failed to fetch your courses" });
    }
};


const getCourseById = async (req, res) => {
    try {
        const { courseId } = req.params;
        if (!courseId) return res.status(400).json({ message: "CourseID is required" })

        const course = await Course.findById(courseId)
            .populate("department", "name code isActive")
            .populate("createdBy", "fullName email username")
            .populate({
                path: "modules",
                select: "title",
                populate: { path: "lessons", select: "title" }
            })

        if (!course) return res.status(404).json({ message: "Course Not found" })

        const department = course.department;

        //only admins
        if (req.user.role === "admin") {
            return res.status(200).json({
                message: "Course fetched successfully",
                course
            })
        }

        if (!department?.isActive) return res.status(403).json({ message: "Department is inActive" })

        const enrollment = await CourseEnrollment.findOne({
            user: req.user._id,
            course: courseId
        })

        if (req.user.role === "teacher") {
            if (!enrollment || enrollment.role !== "teacher") {
                return res.status(403).json({ message: "You're not assigned to teach this course" })
            }
            return res.status(200).json({
                message: "Course fetched successfully",
                course
            })
        }

        if (req.user.role === "student") {
            if (!enrollment || enrollment.role !== "student") {
                return res.status(403).json({ message: "You're not enrolled in this course" })
            }

            if (!course.isPublished) return res.status(403).json({ message: "Course is not published yet" })

            return res.status(200).json({
                message: "Course fetched successfully",
                course
            })
        }

        if (req.user.role === "manager") {
            return res.status(200).json({
                message: "Course fetches successfully",
                course
            })
        }

        return res.status(403).json({ message: "Not authorized" })
    } catch (error) {
        console.error("Failed to fetch course", error)
        return res.status(500).json({ message: "Failed to fetch course" })
    }
}

const updateCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { title, description, department, courseCode } = req.body;
        if (!courseId) return res.status(400).json({ message: "CourseID is required" })

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: "Course not found" })

        let enrollment = null;
        if (req.user.role !== "admin") {
            enrollment = await CourseEnrollment.findOne({
                user: req.user._id,
                course: courseId
            })

            if (req.user.role === "teacher") {
                if (!enrollment || enrollment.role !== "teacher") {
                    return res.status(403).json({ message: "Not authorized to update this course" })
                }
            } else {
                return res.status(403).json({ message: "Not authorized" })
            }
        }

        const updateData = {
            ...(title && { title: title.trim() }),
            ...(description && { description: description.trim() }),
            ...(courseCode && { courseCode: courseCode.trim() }),
            ...(department && { department }),
            ...(isPublished !== undefined && { isPublished }),
        }

        if (courseCode) {
            const exists = await Course.findOne({
                courseCode: courseCode.trim(),
                _id: { $ne: courseId }
            })
            if (exists) return res.status(409).json({ message: "courseCode already in use" })
        }

        const updatedCourse = await Course.findByIdAndUpdate(
            courseId,
            updateData,
            { new: true }
        )

        return res.status(200).json({
            message: "Course updated successfully",
            course: updatedCourse
        })
    } catch (error) {
        console.error("Update Course Error:", error);
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