import asyncHandler from "../../middlewares/asyncHandler.middleware.js";
import { Assignment } from "../../models/assignment.model.js";
import { Department } from "../../models/department.model.js";
import { User } from "../../models/user.model.js";
import ApiError from "../../utils/apiError.js";


const getAllDepartments = asyncHandler(async (req, res) => {
    const user = req.user;

    if (user.role !== "manager") {
        throw new ApiError(403, "Access denied. Managers only")
    }

    const managerDetails = await User.findById(user._id).select("department")
    if (!managerDetails || !managerDetails.department) {
        throw new ApiError(403, "Manager is not assigned to any departments")
    }

    const department = await Department.findById(managerDetails.department)
    if (!department) throw new ApiError(404, "Department not found")

    return res.status(200).json({
        success: true,
        message: "Department details fetched successfully",
        department
    })
})

const getDepartmentOverviewStats = asyncHandler(async (req, res) => {
    const user = req.user;

    if (user.role !== "manager") throw new ApiError(403, "Access denied. Managers only")

    const deptId = user?.department;
    if (!deptId) throw new ApiError(403, "Manager is not assigned to any department")

    const [department, totalStudents, totalTeachers, totalCourses, courses] = await Promise.all([
        Department.findById(deptId).select("name code isActive"),
        User.countDocuments({ department: deptId, role: "student", isActive: true }),
        User.countDocuments({ department: deptId, role: "teacher", isActive: true }),
        Course.countDocuments({ department: deptId }),
        Course.find({ department: deptId }).select("_id")
    ])

    if (!department) throw new ApiError(404, "Assigned department not found")

    const courseIds = courses.map(c => c._id);
    const activeAssignment = await Assignment.countDocuments({
        course: { $in: courseIds },
        isActive: true,
        isPublished: true,
        dueDate: { $gte: new Date() }
    })

    return res.status(200).json({
        success: true,
        message: "Department overview stats fetched successfullu",
        data: {
            department: {
                name: department.name,
                code: department.code,
                status: department.isActive ? "Active" : "Inactive"
            },
            stats: {
                totalCourses, totalStudents, totalTeachers, activeAssignment
            }
        }
    })
})


export {
    getAllDepartments
}