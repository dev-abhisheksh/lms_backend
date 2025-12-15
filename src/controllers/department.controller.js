import { Department } from "../models/department.model.js";
import { client } from "../utils/redisClient.js";

const delRedisCache = async (client, patterns) => {
    const patternArray = Array.isArray(patterns) ? patterns : [patterns]
    let totalDeleted = 0;
    for (const pattern of patternArray) {
        let cursor = "0";
        do {
            const [next, keys] = await client.scan(cursor, "MATCH", pattern, "COUNT", 100)
            if (keys.length > 0) {
                await client.del(...keys)
                totalDeleted += keys.length
            }
            cursor = next;
        } while (cursor !== "0")
    }
    console.log("Cleared chahce")
}

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

        await delRedisCache(client, [
            `allDepartments:*`,
            `departmentById:*`
        ])


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
        let query = {};
        if (req.user.role === "student" || req.user.role === "teacher" || req.user.role === "manager") {
            query = { isActive: true }
        }

        const cacheKey = `allDepartments:${req.user.role}`
        const cached = await client.get(cacheKey)
        if (cached) {
            return res.status(200).json({
                message: "Fetched all departments",
                departments: JSON.parse(cached)
            })
        }

        const departments = await Department.find(query).sort({ name: 1 })

        if (!departments.length)
            return res.status(404).json({ message: "No departments found" });

        await client.set(cacheKey, JSON.stringify(departments), "EX", 1000)

        return res.status(200).json({
            message: "Fetched all departments",
            departments
        })

    } catch (error) {
        console.error("Failed to fetch departments", error)
        return res.status(500).json({ message: "Failed to fetch departments" })
    }
}

const getDepartmentById = async (req, res) => {
    try {
        const { departmentId } = req.params;
        if (!departmentId) return res.status(400).json({ message: "DepartmentId is required" })

        const cacheKey = `departmentById:${departmentId}`
        const cached = await client.get(cacheKey)
        if (cached) {
            return res.status(200).json({
                message: "Fetched department",
                department: JSON.parse(cached)
            })
        }

        const department = await Department.findById(departmentId)
        if (!department) return res.status(404).json({ message: "Department not found" })

        //role check : Only Admins
        if ((req.user.role === "manager" ||
            req.user.role === "teacher" ||
            req.user.role === "student") &&
            !department.isActive
        ) return res.status(403).json({ message: "Not authorized to view this department" })

        await client.set(cacheKey, JSON.stringify(department), "EX", 1000)

        return res.status(200).json({
            message: "Fetched department",
            department
        })

    } catch (error) {
        console.error("Failed to fetch department", error)
        return res.status(500).json({ message: "Failed to fetch department" })
    }
}

const toggleDepartment = async (req, res) => {
    try {
        const { departmentId } = req.params;
        if (!departmentId) return res.status(400).json({ message: "DepartmentId is required" })

        if (req.user.role !== "admin") return res.status(403).json({ message: "Not authorized" })

        const department = await Department.findById(departmentId).select("name code isActive description createdBy")
        if (!department) return res.status(404).json({ message: "Department not found" })

        department.isActive = !department.isActive;
        await department.save();

        const departmentIdStr = departmentId.toString()
        await delRedisCache(client, [
            `allDepartments:*`,
            `departmentById:${departmentIdStr}*`
        ])

        return res.status(200).json({
            message: `Department "${department.name}" is now ${department.isActive ? "active" : "inactive"}.`,
            department,
        });
    } catch (error) {
        console.error("Toggle Department Error:", error);
        return res.status(500).json({ message: "Failed to toggle department status" });
    }
}

const updateDepartment = async (req, res) => {
    try {
        const { departmentId } = req.params;
        const { name, description } = req.body;
        if (!departmentId) return res.status(400).json({ message: "DepartmentID are required" })
        if (!name && !description) return res.status(400).json({ message: "Atleast provide one field to update" })

        //role check: Admins only
        if (req.user.role !== "admin") return res.status(403).json({ message: "Not authorized" })

        //department check
        const existingDepartment = await Department.findById(departmentId)
        if (!existingDepartment) return res.status(404).json({ message: "Department not found" })

        //dublicate namr check
        if (name) {
            const nameExists = await Department.findOne({
                _id: { $ne: departmentId },
                name: name.trim()
            })

            if (nameExists) {
                return res.status(409).json({ message: "Department name already exists" })
            }
        }
        const updatedDepartment = await Department.findByIdAndUpdate(
            departmentId,
            {
                ...(name && { name: name.trim() }),
                ...(description && { description: description.trim() })
            },
            { new: true }
        )

        const departmentIdStr = departmentId.toString()
        await delRedisCache(client, [
            `allDepartments:*`,
            `departmentById:${departmentIdStr}*`
        ])

        return res.status(200).json({
            message: "Department updated successfully",
            department: updatedDepartment
        })
    } catch (error) {
        console.error("Failed to update department", error)
        return res.status(500).json({ message: "Failed to update department" })
    }
}

export {
    createDepartment,
    getAllDepartments,
    getDepartmentById,
    toggleDepartment,
    updateDepartment
}