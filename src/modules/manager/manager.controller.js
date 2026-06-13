import mongoose from "mongoose";
import asyncHandler from "../../middlewares/asyncHandler.middleware.js";
import { Department } from "../../models/department.model.js";
import { User } from "../../models/user.model.js";
import { Course } from "../../models/course.model.js";
import ApiError from "../../utils/apiError.js";

/**
 * @desc    Get detailed info of the manager's assigned department
 * @route   GET /api/v1/manager/department
 */
const getMyDepartment = asyncHandler(async (req, res) => {
    const user = req.user;

    if (user.role !== "manager") {
        throw new ApiError(403, "Access denied. Managers only")
    }

    let departmentId = user.department;
    if (!departmentId) {
        const userFromDb = await User.findById(user._id).select("department");
        departmentId = userFromDb?.department;
    }

    if (!departmentId) {
        throw new ApiError(403, "Manager is not assigned to any department")
    }

    const department = await Department.findById(departmentId)
    if (!department) throw new ApiError(404, "Department not found")

    return res.status(200).json({
        success: true,
        message: "Department details fetched successfully",
        department
    })
})

/**
 * @desc    Get high-level aggregated stats for the manager's department
 * @route   GET /api/v1/manager/stats/overview
 */
const getDepartmentOverviewStats = asyncHandler(async (req, res) => {
    let deptId = req.user.department;

    if (req.user.role !== "manager") {
        throw new ApiError(403, "Access denied. Managers only");
    }

    if (!deptId) {
        const userFromDb = await User.findById(req.user._id).select("department");
        deptId = userFromDb?.department;
    }

    if (!deptId) {
        throw new ApiError(403, "Manager is not assigned to any department");
    }

    const stats = await Department.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(deptId) }
        },
        {
            $lookup: {
                from: "courses",
                localField: "_id",
                foreignField: "department",
                as: "courses"
            }
        },
        // Count students directly linked to this department
        {
            $lookup: {
                from: "users",
                let: { deptId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$department", "$$deptId"] },
                                    { $eq: ["$role", "student"] }
                                ]
                            },
                            isActive: true
                        }
                    },
                    { $count: "count" }
                ],
                as: "studentStats"
            }
        },
        // Count unique teachers enrolled in any course of this department
        {
            $lookup: {
                from: "courseenrollments",
                let: { courseIds: "$courses._id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $in: ["$course", "$$courseIds"] },
                                    { $eq: ["$role", "teacher"] }
                                ]
                            }
                        }
                    },
                    { $group: { _id: "$user" } },
                    { $count: "count" }
                ],
                as: "teacherStats"
            }
        },
        {
            $lookup: {
                from: "assignments",
                let: { courseIds: "$courses._id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $in: ["$course", "$$courseIds"] },
                                    { $eq: ["$isActive", true] },
                                    { $eq: ["$isPublished", true] },
                                    { $gte: ["$dueDate", new Date()] }
                                ]
                            }
                        }
                    },
                    { $count: "count" }
                ],
                as: "assignmentStats"
            }
        },
        {
            $project: {
                name: 1,
                code: 1,
                isActive: 1,
                totalCourses: { $size: "$courses" },
                activeAssignments: { $ifNull: [{ $arrayElemAt: ["$assignmentStats.count", 0] }, 0] },
                totalStudents: { $ifNull: [{ $arrayElemAt: ["$studentStats.count", 0] }, 0] },
                totalTeachers: { $ifNull: [{ $arrayElemAt: ["$teacherStats.count", 0] }, 0] }
            }
        }
    ]);

    if (!stats || stats.length === 0) {
        throw new ApiError(404, "Department stats not found");
    }

    return res.status(200).json({
        success: true,
        message: "Department stats aggregated successfully",
        data: stats[0]
    });
});

/**
 * @desc    Get a unified activity feed for the department
 * @route   GET /api/v1/manager/activity
 */
const getDepartmentActivity = asyncHandler(async (req, res) => {
    let deptId = req.user.department;

    if (req.user.role !== "manager") {
        throw new ApiError(403, "Access denied. Managers only");
    }

    if (!deptId) {
        const userFromDb = await User.findById(req.user._id).select("department");
        deptId = userFromDb?.department;
    }

    if (!deptId) {
        throw new ApiError(403, "Manager is not assigned to any department");
    }

    const activityFeed = await Course.aggregate([
        { $match: { department: new mongoose.Types.ObjectId(deptId) } },
        {
            $facet: {
                announcements: [
                    {
                        $lookup: {
                            from: "announcements",
                            localField: "_id",
                            foreignField: "course",
                            pipeline: [
                                { $sort: { createdAt: -1 } },
                                { $limit: 10 },
                                {
                                    $lookup: {
                                        from: "users",
                                        localField: "author",
                                        foreignField: "_id",
                                        as: "author"
                                    }
                                },
                                { $unwind: "$author" }
                            ],
                            as: "items"
                        }
                    },
                    { $unwind: "$items" },
                    {
                        $project: {
                            type: { $literal: "announcement" },
                            content: "$items.title",
                            courseName: "$title",
                            userName: "$items.author.fullName",
                            timestamp: "$items.createdAt"
                        }
                    }
                ],
                assignments: [
                    {
                        $lookup: {
                            from: "assignments",
                            localField: "_id",
                            foreignField: "course",
                            pipeline: [
                                { $match: { isPublished: true, isActive: true } },
                                { $sort: { createdAt: -1 } },
                                { $limit: 10 },
                                {
                                    $lookup: {
                                        from: "users",
                                        localField: "createdBy",
                                        foreignField: "_id",
                                        as: "creator"
                                    }
                                },
                                { $unwind: "$creator" }
                            ],
                            as: "items"
                        }
                    },
                    { $unwind: "$items" },
                    {
                        $project: {
                            type: { $literal: "assignment" },
                            content: "$items.title",
                            courseName: "$title",
                            userName: "$items.creator.fullName",
                            timestamp: "$items.createdAt"
                        }
                    }
                ],
                submissions: [
                    {
                        $lookup: {
                            from: "assignments",
                            localField: "_id",
                            foreignField: "course",
                            as: "courseAssignments"
                        }
                    },
                    { $unwind: "$courseAssignments" },
                    {
                        $lookup: {
                            from: "submissions",
                            localField: "courseAssignments._id",
                            foreignField: "assignment",
                            pipeline: [
                                { $match: { status: { $ne: "deleted" } } },
                                { $sort: { createdAt: -1 } },
                                { $limit: 10 },
                                {
                                    $lookup: {
                                        from: "users",
                                        localField: "student",
                                        foreignField: "_id",
                                        as: "student"
                                    }
                                },
                                { $unwind: "$student" }
                            ],
                            as: "items"
                        }
                    },
                    { $unwind: "$items" },
                    {
                        $project: {
                            type: { $literal: "submission" },
                            content: "$courseAssignments.title",
                            courseName: "$title",
                            userName: "$items.student.fullName",
                            timestamp: "$items.createdAt"
                        }
                    }
                ]
            }
        },
        {
            $project: {
                combined: { $concatArrays: ["$announcements", "$assignments", "$submissions"] }
            }
        },
        { $unwind: "$combined" },
        { $replaceRoot: { newRoot: "$combined" } },
        { $sort: { timestamp: -1 } },
        { $limit: 20 }
    ]);

    return res.status(200).json({
        success: true,
        count: activityFeed.length,
        data: activityFeed
    });
});


const getDepartmentTeachers = asyncHandler(async (req, res) => {
    if (req.user.role !== "manager") throw new ApiError(403, "Access denied. Managers only")

    const deptId = req.user.department
    if (!deptId) throw new ApiError(404, "Assigned Department not found")

    const teachers = await Course.aggregate([
        { $match: { department: deptId } },
        { $group: { _id: "$instructor", courseCount: { $sum: 1 }, courseNames: { $push: "$title" } } },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "info" } },
        { $unwind: "$info" },
        { $project: { name: "$info.name", email: "$info.email", courseCount: 1, courseNames: 1 } }
    ])

    return res.status(200).json({
        success: true,
        message: "Fetched all teacher details",
        teachers
    })
})

export {
    getMyDepartment,
    getDepartmentOverviewStats,
    getDepartmentActivity
}
