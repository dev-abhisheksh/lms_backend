import mongoose from "mongoose";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";

//Access Token
const generateAccessToken = (user) => {
    return jwt.sign(
        {
            _id: user._id,
            email: user.email,
            username: user.username,
            fullName: user.fullName,
            role: user.role,
            department: user.department
        },
        process.env.ACCESS_TOKEN_SECRET,
        console.log(
            "ACCESS_TOKEN_SECRET (verify):",
            process.env.ACCESS_TOKEN_SECRET
        ),

        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1h" }
    )
}

//Refresh Token
const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            _id: user._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" }
    )
}


const registerUser = async (req, res) => {
    try {
        const { fullName, username, email, password, role, department, year, cohortYear } = req.body;
        if (!fullName || !username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(409).json({ message: "User already exists. Please login" })
        }

        // Validate department if provided
        let departmentId = null;
        if (department) {
            const { Department } = await import("../models/department.model.js");
            const deptExists = await Department.findById(department);
            if (!deptExists) {
                return res.status(404).json({ message: "Department not found" });
            }
            departmentId = department;
        }

        // Validate year if student
        if (role === "student" && year && !["FY", "SY", "TY"].includes(year)) {
            return res.status(400).json({ message: "Year must be FY, SY, or TY" });
        }

        // Validate cohortYear if provided
        let cohortYearValue = null;
        if (role === "student" && cohortYear) {
            const parsedYear = parseInt(cohortYear, 10);
            if (isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
                return res.status(400).json({ message: "Invalid cohortYear (admission year)" });
            }
            cohortYearValue = parsedYear;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const createUser = await User.create({
            fullName: fullName.trim(),
            username: username.trim().toLowerCase(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            role,
            ...(departmentId && { department: departmentId }),
            ...(year && { year }),
            ...(cohortYearValue && { cohortYear: cohortYearValue })
        });

        const user = createUser.toObject();
        delete user.password;

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user)

        createUser.refreshToken = refreshToken
        await createUser.save({ validateBeforeSave: false })

        return res.status(201).json({ message: "User created successfully", user, accessToken, refreshToken })
    } catch (error) {
        console.error("Failed to register user", error.message);
        return res.status(500).json({ message: "Failed to register user" })
    }
}

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" })
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: "User not registered" })
        }

        const isMatchPassword = await bcrypt.compare(password, user.password);
        if (!isMatchPassword) {
            return res.status(401).json({ message: "Invalid user credentials" })
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        user.refreshToken = refreshToken;
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false })

        const noPassUser = user.toObject();
        delete noPassUser.password;

        return res.status(200).json({ message: "User loggedIn successfully", user: noPassUser, accessToken, refreshToken })
    } catch (error) {
        console.error("Failed to login user", error.message);
        return res.status(500).json({ message: "Failed to login user" })
    }
}

const logoutUser = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" })
    }

    await User.findByIdAndUpdate(req.user._id, {
        $unset: { refreshToken: 1 }
    })

    return res.status(200).json({ message: "Logged out" })
}

const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user?._id)
            .select("-password -refreshToken")
            .populate("department", "name code");

        if (!user) return res.status(404).json({
            message: "User not found",
        })

        // Fetch counts for stats
        const { CourseEnrollment } = await import("../models/courseEnrollment.model.js");
        const { Submission } = await import("../models/submissions.model.js");
        
        const courseCount = await CourseEnrollment.countDocuments({ user: user._id });
        const submissionCount = await Submission.countDocuments({ student: user._id });

        return res.status(200).json({
            message: "User details fetched",
            user: {
                ...user.toObject(),
                stats: {
                    courses: courseCount,
                    submissions: submissionCount
                }
            }
        })
    } catch (error) {
        console.error("Failed to fetch user details", error)
        return res.status(500).json({ message: "Failed to fetch user details" })
    }
}

const updateProfile = async (req, res) => {
    try {
        const { fullName, username, email } = req.body;
        const user = await User.findById(req.user?._id);

        if (!user) return res.status(404).json({ message: "User not found" });

        if (fullName) user.fullName = fullName.trim();
        if (username) {
            const existing = await User.findOne({ username: username.trim().toLowerCase(), _id: { $ne: user._id } });
            if (existing) return res.status(409).json({ message: "Username already taken" });
            user.username = username.trim().toLowerCase();
        }
        if (email) {
            const existing = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: user._id } });
            if (existing) return res.status(409).json({ message: "Email already taken" });
            user.email = email.trim().toLowerCase();
        }

        await user.save();
        
        const safeUser = user.toObject();
        delete safeUser.password;
        delete safeUser.refreshToken;

        return res.status(200).json({ message: "Profile updated successfully", user: safeUser });
    } catch (error) {
        console.error("Failed to update profile", error);
        return res.status(500).json({ message: "Failed to update profile" });
    }
}

const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "Old and new passwords are required" });
        }

        const user = await User.findById(req.user?._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(401).json({ message: "Incorrect old password" });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        return res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
        console.error("Failed to change password", error);
        return res.status(500).json({ message: "Failed to change password" });
    }
}

const getAllUsers = async (req, res) => {
    try {
        // Only admins can view all users
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized to view all users" })
        }

        const { search, role, department, year, page = 1, limit = 20 } = req.query;

        const query = {};
        
        if (role) {
            query.role = role;
        }

        if (department) {
            query.department = department;
        }

        if (year) {
            query.year = year;
        }

        if (search && search.trim()) {
            const re = new RegExp(search.trim(), "i");
            query.$or = [
                { fullName: re },
                { email: re },
                { username: re }
            ];
        }

        const skip = (Math.max(1, Number(page)) - 1) * Math.min(100, Number(limit));
        
        const users = await User.find(query)
            .select("_id fullName username email role department year isActive createdAt")
            .populate("department", "name code")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Math.min(100, Number(limit)));

        const totalUsers = await User.countDocuments(query);

        return res.status(200).json({
            message: "Users fetched successfully",
            meta: {
                page: Number(page),
                limit: Number(limit),
                total: totalUsers,
                pages: Math.ceil(totalUsers / Math.min(100, Number(limit)))
            },
            users
        });
    } catch (error) {
        console.error("Failed to fetch users:", error);
        return res.status(500).json({ message: "Failed to fetch users" });
    }
}

const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) return res.status(400).json({ message: "userId is required" });

        // Only admins and managers may fetch user details for assignment contexts
        if (req.user.role !== "admin" && req.user.role !== "manager") {
            return res.status(403).json({ message: "Not authorized to view user details" });
        }

        const user = await User.findById(userId)
            .select("_id fullName username email role department year")
            .populate("department", "name code");

        if (!user) return res.status(404).json({ message: "User not found" });

        // Fetch courses where the user is a teacher
        const { CourseEnrollment } = await import("../models/courseEnrollment.model.js");
        const teacherEnrollments = await CourseEnrollment.find({ user: userId, role: "teacher" })
            .populate("course", "title courseCode")
            .lean();

        const managedCourses = teacherEnrollments.map(te => ({
            _id: te.course._id,
            title: te.course.title,
            courseCode: te.course.courseCode,
            enrolledAt: te.enrolledAt
        }));

        return res.status(200).json({ message: "User fetched", user, managedCourses });
    } catch (error) {
        console.error("Failed to fetch user by id:", error);
        return res.status(500).json({ message: "Failed to fetch user by id" });
    }
}

const getBatches = async (req, res) => {
    try {
        // Only admins can view batches
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized to view batches" })
        }

        // Get all unique batches (department + year + cohortYear) with student counts
        const batches = await User.aggregate([
            {
                $match: {
                    role: "student",
                    department: { $ne: null },
                    year: { $ne: null },
                    cohortYear: { $ne: null }
                }
            },
            {
                $group: {
                    _id: {
                        department: "$department",
                        year: "$year",
                        cohortYear: "$cohortYear"
                    },
                    studentCount: { $sum: 1 },
                    students: { $push: "$_id" }
                }
            },
            {
                $lookup: {
                    from: "departments",
                    localField: "_id.department",
                    foreignField: "_id",
                    as: "departmentInfo"
                }
            },
            {
                $unwind: "$departmentInfo"
            },
            {
                $sort: {
                    "departmentInfo.name": 1,
                    "_id.cohortYear": -1,
                    "_id.year": 1
                }
            }
        ]);

        return res.status(200).json({
            message: "Batches fetched successfully",
            batches: batches.map(batch => ({
                department: {
                    _id: batch._id.department,
                    name: batch.departmentInfo.name,
                    code: batch.departmentInfo.code
                },
                year: batch._id.year,
                cohortYear: batch._id.cohortYear,
                studentCount: batch.studentCount,
                studentIds: batch.students
            }))
        });
    } catch (error) {
        console.error("Failed to fetch batches:", error);
        return res.status(500).json({ message: "Failed to fetch batches" });
    }
}

const updateUserRole = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized to update user roles" });
        }

        const { userId } = req.params;
        const { role } = req.body;

        if (!userId || !role) {
            return res.status(400).json({ message: "userId and role are required" });
        }

        const allowedRoles = ["student", "ta", "teacher", "manager", "admin"];
        const newRole = role.toLowerCase();
        if (!allowedRoles.includes(newRole)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const currentRole = (user.role || "").toLowerCase();
        const currentIndex = allowedRoles.indexOf(currentRole);
        const newIndex = allowedRoles.indexOf(newRole);

        // Prevent role demotion: disallow changing to a role with lower privilege index
        if (newIndex < currentIndex) {
            return res.status(400).json({ message: "Role downgrade is not allowed" });
        }

        // Apply role change
        user.role = newRole;
        await user.save();

        const safeUser = user.toObject();
        delete safeUser.password;

        return res.status(200).json({ message: "Role updated", user: safeUser });
    } catch (error) {
        console.error("Failed to update user role:", error);
        return res.status(500).json({ message: "Failed to update role" });
    }
}

const updateBatchYear = async (req, res) => {
    try {
        // Only admins can update batches
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized to update batches" })
        }

        const { departmentId, cohortYear, currentYear, newYear } = req.body;

        if (!departmentId || !cohortYear || !currentYear || !newYear) {
            return res.status(400).json({ message: "departmentId, cohortYear, currentYear, and newYear are required" })
        }

        const validYears = ["FY", "SY", "TY"];
        if (!validYears.includes(currentYear) || !validYears.includes(newYear)) {
            return res.status(400).json({ message: "Invalid year. Must be FY, SY, or TY" })
        }

        // ── Step 1: Find all students in this specific batch ─────────────────
        const batchStudents = await User.find({
            role: "student",
            department: departmentId,
            cohortYear: Number(cohortYear),
            year: currentYear
        }).select("_id");

        if (batchStudents.length === 0) {
            return res.status(404).json({ message: "No students found in this batch" });
        }

        const studentIds = batchStudents.map(s => s._id);

        // ── Step 2: Remove enrollments for the OLD year's courses ─────────────
        // Find all courses for this department + old year
        const { Course } = await import("../models/course.model.js");
        const { CourseEnrollment } = await import("../models/courseEnrollment.model.js");

        const oldYearCourses = await Course.find({
            department: departmentId,
            year: currentYear
        }).select("_id");

        const oldCourseIds = oldYearCourses.map(c => c._id);

        let removedEnrollments = 0;
        if (oldCourseIds.length > 0) {
            const deleteResult = await CourseEnrollment.deleteMany({
                user: { $in: studentIds },
                course: { $in: oldCourseIds }
            });
            removedEnrollments = deleteResult.deletedCount;
        }

        // ── Step 3: Promote the batch to the new year ─────────────────────────
        const result = await User.updateMany(
            {
                role: "student",
                department: departmentId,
                cohortYear: Number(cohortYear),
                year: currentYear
            },
            { year: newYear }
        );

        return res.status(200).json({
            message: `${result.modifiedCount} students promoted from ${currentYear} to ${newYear}. ${removedEnrollments} old course enrollments removed.`,
            modifiedCount: result.modifiedCount,
            removedEnrollments
        });
    } catch (error) {
        console.error("Failed to update batch year:", error);
        return res.status(500).json({ message: "Failed to update batch year" });
    }
}

export {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    getAllUsers,
    getBatches,
    updateBatchYear,
    updateUserRole,
    getUserById,
    updateProfile,
    changePassword
}