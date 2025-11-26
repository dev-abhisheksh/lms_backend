import { Department } from "../models/department.model.js";


const createDepartment = async (req, res) => {
    try {
        const { name, code, description, isActive } = req.body;
        if (!name || !code) return res.status(400).json({ message: "Name & Code fields are reqiured" })

        //role check: only Admin
        if (req.user.role !== "admin") return res.status(403).json({ message: "Not authorized" })

        const existing = await Department.findOne({
            $or: [{ name }, { code }]
        })

        if (existing) {
            return res.status(409).json({
                message: existing.name === name
                    ? "Department name already exisits"
                    : "Department code already exists"
            })
        }

        const department = await Department.create({
            name: name.trim(),
            description: description.trim() || "",
            isActive: typeof isActive === "boolean" ? isActive : true,
            createdBy: req.user._id,
            code
        })

        return res.status(201).json({
            message: "Department created successfully",
            department
        })
    } catch (error) {
        console.error("Failed to create Department", error.message)
        return res.status(500).json({ message: "Failed to create Department" })
    }
}

const getAllDepartments = async (req, res) => {
    try {
        const departments = await Department.find({ isActive: true }).sort({ name: 1 })

        return res.status(200).json({ message: "Fetched all departments", departments })

    } catch (error) {
        console.error("Failed to fetch departments", error.message)
        return res.status(500).json({ message: "Failed to fetch departments" })
    }
}

export {
    createDepartment,
    getAllDepartments
}