import asyncHandler from "../../middlewares/asyncHandler.middleware.js";
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

export {
    getAllDepartments
}