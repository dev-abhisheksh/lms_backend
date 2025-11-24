import { Course } from "../models/course.model.js"
import { User } from "../models/user.model.js"
import { CourseEnrollment } from "../models/courseEnrollment.model.js"

const assignUserToCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { userId, role } = req.body;

        if (!userId || !role || !courseId) {
            return res.status(400).json({ message: "courseId, userId, and role are required" });
        }

        const course = await Course.findById(courseId)
        if (!course) return res.status(404).json({ message: "Course not found" })
        const user = await User.findById(userId)
        if (!user) return res.status(404).json({ message: "User not found" })

        const validateRoles = ["teacher", "manager", "student"]
        if (!validateRoles.includes(role)) return res.status(400).json({ message: "Invalid role. Must be student, teacher, or manager." });

        const existing = await CourseEnrollment.findOne({ user: userId, course: courseId }).lean();
        if (existing) return res.status(400).json({ message: "User is already enrolled in the course" })

        const newEnrollment = await CourseEnrollment.create({
            user: userId,
            course: courseId,
            role
        })

        const populatedEnrollment = await CourseEnrollment.findById(newEnrollment._id)
            .populate("user", "fullName email role")
            .populate("course", "title description")

        return res.status(201).json({
            message: "User enrolled in the course successfully",
            enrollment: populatedEnrollment
        })
    } catch (error) {
        console.error("Failed to enroll in the course", error.message);
        return res.status(500).json({ message: "Failed to enroll in the course" })
    }
}

const getCourseParticipants = async (req, res) => {
    try {
        const { courseId } = req.params;
        if (!courseId) return res.status(400).json({ message: "ID is required" })

        //existing course
        const existingCourse = await Course.findById(courseId).select("title description")
        if (!existingCourse) return res.status(404).json({ message: "Course not found" })

        const enrollments = await CourseEnrollment.find({ course: courseId })
            .populate("user", "fullName email role")
            .populate("course", "title description")
            .lean()

        if (enrollments.length === 0) {
            return res.status(200).json({
                message: "No users enrolled in this course yet",
                course: existingCourse,
                participants: { teachers: [], students: [], managers: [] }
            })
        }

        const teachers = [];
        const managers = [];
        const students = [];

        enrollments.forEach((enroll) => {
            if (enroll.role === "teacher") teachers.push(enroll.user)
            else if (enroll.role === "student") students.push(enroll.user)
            else if (enroll.role === "manager") managers.push(enroll.user)
        })

        const participants = { teachers, students, managers };

        return res.status(200).json({
            message: "Fetched all the enrollments",
            course: existingCourse,
            participants
        })
    } catch (error) {
        console.error("Failed to fetch enrollments", error.message)
        return res.status(500).json({ message: "Failed to fetch enrollments" })
    }
}

const getMyEnrollments = async (req, res) => {
    try {
        const userId = req.user._id;

        //user exists check
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" })

        const enrollments = await CourseEnrollment.find({ user: userId })
            .populate("course", "title description isPublished")
            .lean()

        if (enrollments.length === 0) {
            return res.status(200).json({ message: "You haven’t enrolled in any courses yet", myEnrolls: [] });
        }

        return res.status(200).json({
            message: "Fetched all my Enrollments",
            enrollments,
            totalEnrollments: enrollments.length

        })
    } catch (error) {
        console.error("Failed to fetch user enrollments", error.message);
        return res.status(500).json({ message: "Failed to fetch user enrollments" });
    }
}

const removeUserFromCourse = async (req, res) => {
    try {
        const { courseId, userId } = req.params

        if (!courseId || !userId) return res.status(400).json({ message: "Ids are required" })

        const course = await Course.findById(courseId).select("title description isPublished")
        if (!course) return res.status(404).json({ message: "Course not found" })

        const targetUser = await User.findById(userId).select("fullName email role")
        if (!targetUser) return res.status(404).json({ message: "User not found" })

        if (req.user.role === "manager" && (targetUser === "manager" || targetUser === "admin")) {
            return res.status(403).json({ message: "managers cannot remove other managers or admins from the course" })
        }

        const enrollments = await CourseEnrollment.findOne({ user: userId, course: courseId })
        if (!enrollments) return res.status(404).json({ message: `${targetUser.fullName} is not enrolled in the course` });

        await CourseEnrollment.deleteOne({ _id: enrollments._id })

        return res.status(200).json({
            message: `Removed ${targetUser.fullName} (${targetUser.role}) from course '${course.title}' successfully`
        });
    } catch (error) {
        console.error("Failed to remove user from course:", error.message);
        return res.status(500).json({ message: "Failed to remove user from course" });
    }
}

export {
    assignUserToCourse,
    getCourseParticipants,
    getMyEnrollments
}