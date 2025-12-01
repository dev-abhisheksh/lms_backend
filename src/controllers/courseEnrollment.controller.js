import { Course } from "../models/course.model.js"
import { User } from "../models/user.model.js"
import { CourseEnrollment } from "../models/courseEnrollment.model.js"

const assignUserToCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { userId, role } = req.body;
        if (!courseId || !userId || !role) return res.status(400).json({ message: "CourseID, UserID and role are required" })

        //checking of Course and User exisits in the DATABASE
        const course = await Course.findById(courseId).select("title description department")
        if (!course) return res.status(404).json({ message: "Course not found" })

        const user = await User.findById(userId).select("fullName username email role")
        if (!user) return res.status(404).json({ message: "User not found" })

        //only admins and managers are allowed
        if (req.user.role !== "admin" && req.user.role !== "manager") {
            return res.status(403).json({ message: "Not authorized to Assign users to course" })
        }

        //only students and teachers can be enrolled
        const allowedRoles = ["teacher", "student"];
        if (!allowedRoles.includes(role)) {
            return res.status(403).json({ message: "Role must be either student or teacher" })
        }

        // User cannot be enrolled as a role they don't globally have
        if (role !== user.role) {
            return res.status(400).json({ message: `User is a global '${user.role}', cannot enroll as '${role}'` });
        }

        //prevent enrolled user to enroll again
        const existingEnrollment = await CourseEnrollment.findOne({ user: userId, course: courseId })
        if (existingEnrollment) return res.status(409).json({ message: "User is already enrolled in this course" })

        const enrollment = await CourseEnrollment.create({
            user: userId,
            course: courseId,
            role
        })

        return res.status(201).json({
            message: "User enrolled successfully",
            enrollment
        })
    } catch (error) {
        console.error("Failed to enroll in the course", error.message);
        return res.status(500).json({ message: "Failed to enroll in the course" })
    }
}

const getAllEnrollmentsForCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        if (!courseId) return res.status(400).json({ message: "CourseID is required" })

        const course = await Course.findById(courseId)
            .populate("department", "name code isActive")
        if (!course) return res.status(404).json({ message: "Course not found" })

        if (req.user.role === "admin") {
            const enrollments = await CourseEnrollment.find({ course: courseId })
                .populate("user", "fullName username email role")
                .populate("course", "title courseCode ")
            return res.status(200).json({
                message: "Enrollments fetched successfully",
                count: enrollments.length,
                enrollments,
            })
        }

        if (!course.department?.isActive) {
            return res.status(403).json({ message: "Department is deActive" })
        }

        if (req.user.role === "teacher") {
            const enrolledTeacher = await CourseEnrollment.findOne({
                user: req.user._id,
                course: courseId,
                role: "teacher"
            })
            if (!enrolledTeacher) return res.status(403).json({ message: "Your not assigned to teach this course" })

            const enrollments = await CourseEnrollment.find({ course: courseId })
                .populate("user", "fullName username email role")
                .populate("course", "title courseCode")
            return res.status(200).json({
                message: "Enrollments fetched successfully",
                enrollments
            })
        }

        return res.status(403).json({ message: "Not authorized" })

    } catch (error) {
        console.error("Failed to get enrollments", error)
        return res.status(500).json({ message: "Failed to get enrollments" })
    }
}

const getMyEnrollments = async (req, res) => {
    try {
        if (req.user.role === "admin" || req.user.role === "manager") {
            return res.status(403).json({ message: "Enrollments not available for admin and manager" })
        }

        let enrollments = await CourseEnrollment.find({ user: req.user._id })
            .populate({
                path: "course",
                select: "title description isPublished",
                populate: {
                    path: "department",
                    select: "name code isActive"
                }
            })

        if (!enrollments) return res.status(404).json({ message: "Enrollment not found" })

        enrollments = enrollments.filter(en => en.course.department.isActive)
        if (req.user.role === "student") {
            enrollments = enrollments.filter(en => en.course.isPublished)
        }

        return res.status(200).json({
            message: "Fetched your enrollments",
            count: enrollments.length,
            enrollments
        })
    } catch (error) {
        console.error("Failed to fetch your all enrollments", error)
        return res.status(500).json({ message: "Failed to fetch your all enrollments" })
    }
}

const removeUserFromCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { userId } = req.body;

        if (!courseId || !userId) {
            return res.status(400).json({ message: "courseId and userId are required" });
        }

        const course = await Course.findById(courseId)
            .populate("department", "name code isActive");

        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        const department = course.department;

        const targetUser = await User.findById(userId).select("fullName username email role");
        if (!targetUser) {
            return res.status(404).json({ message: "User not found" });
        }

        if (req.user.role !== "admin" && req.user.role !== "manager") {
            return res.status(403).json({ message: "Not authorized" });
        }

        if (req.user.role === "manager") {
            if (!department.isActive) {
                return res.status(403).json({ message: "Department is inactive — manager cannot remove users" });
            }

            if (targetUser.role === "teacher") {
                return res.status(403).json({ message: "Manager cannot remove teachers from courses" });
            }
        }

        const enrollment = await CourseEnrollment.findOne({
            user: userId,
            course: courseId
        });

        if (!enrollment) {
            return res.status(404).json({ message: "User is not enrolled in this course" });
        }

        if (enrollment.role === "teacher") {
            const teacherCount = await CourseEnrollment.countDocuments({
                course: courseId,
                role: "teacher"
            });

            if (teacherCount <= 1) {
                return res.status(400).json({
                    message: "Cannot remove the only teacher assigned to this course"
                });
            }
        }

        await CourseEnrollment.deleteOne({ _id: enrollment._id });

        return res.status(200).json({
            message: `${targetUser.fullName} removed from ${course.title} successfully`
        });

    } catch (error) {
        console.error("Failed to remove user from course:", error);
        return res.status(500).json({ message: "Failed to remove user from course" });
    }
};

const getCourseEnrollmentsSummary = async (req, res) => {
    try {
        const { courseId } = req.params;
        if (!courseId) return res.status(400).json({ message: "CourseId is required" });

        const course = await Course.findById(courseId)
            .select("title courseCode department");

        if (!course) return res.status(404).json({ message: "Course not found" });

        const enrollments = await CourseEnrollment.find({ course: courseId })
            .populate("user", "fullName email role")
            .lean();

        // No enrollments
        if (enrollments.length === 0) {
            return res.status(200).json({
                message: "No enrollments found for this course",
                summary: {
                    total: 0,
                    students: 0,
                    teachers: 0,
                    managers: 0
                },
                participants: {
                    students: [],
                    teachers: [],
                    managers: []
                }
            });
        }

        const participants = {
            students: [],
            teachers: [],
            managers: []
        };

        enrollments.forEach((enroll) => {
            const userData = {
                _id: enroll.user._id,
                fullName: enroll.user.fullName,
                email: enroll.user.email,
                role: enroll.user.role,
                enrolledAt: enroll.enrolledAt   // CORRECT — from CourseEnrollment
            };

            if (enroll.user.role === "student") participants.students.push(userData);
            else if (enroll.user.role === "teacher") participants.teachers.push(userData);
            else if (enroll.user.role === "manager") participants.managers.push(userData);
        });

        const summary = {
            total: enrollments.length,
            students: participants.students.length,
            teachers: participants.teachers.length,
            managers: participants.managers.length
        };

        return res.status(200).json({
            message: "Fetched course enrollment summary successfully",
            course,
            summary,
            participants
        });

    } catch (error) {
        console.error("Failed to fetch course enrollment summary:", error.message);
        return res.status(500).json({ message: "Failed to fetch course enrollment summary" });
    }
};



export {
    assignUserToCourse,
    getMyEnrollments,
    removeUserFromCourse,
    getCourseEnrollmentsSummary,
    getAllEnrollmentsForCourse
}