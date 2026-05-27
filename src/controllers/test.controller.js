import { Test } from "../models/test.model.js";
import { Course } from "../models/course.model.js";
import { CourseEnrollment } from "../models/courseEnrollment.model.js";
import { client } from "../utils/redisClient.js";

export const createTest = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { title, description, type, duration, totalQuestions, totalMarks, passingMarks, isPublished } = req.body;

        if (!courseId || !title?.trim() || !type || !duration || !totalMarks || !passingMarks) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: "Course not found" });

        if (req.user.role === "teacher") {
            const enrollment = await CourseEnrollment.findOne({ user: req.user._id, course: courseId, role: "teacher" });
            if (!enrollment) return res.status(403).json({ message: "Not assigned to teach this course" });
        } else if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        const test = await Test.create({
            title: title.trim(),
            description: description?.trim() || "",
            type,
            duration: Number(duration),
            totalQuestions: Number(totalQuestions) || 0,
            totalMarks: Number(totalMarks),
            passingMarks: Number(passingMarks),
            isPublished: Boolean(isPublished),
            publishedAt: isPublished ? new Date() : null,
            course: courseId,
            createdBy: req.user._id,
        });

        await client.del(`tests:${courseId}`);

        return res.status(201).json({ message: "Test created successfully", test });
    } catch (error) {
        console.error("Create Test Error:", error);
        return res.status(500).json({ message: "Failed to create test" });
    }
};

export const getTestsByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        
        const cacheKey = `tests:${courseId}:${req.user.role}:${req.user._id}`;
        const cached = await client.get(cacheKey);
        if (cached) {
            return res.status(200).json({ tests: JSON.parse(cached) });
        }

        const course = await Course.findById(courseId).populate("department");
        if (!course) return res.status(404).json({ message: "Course not found" });

        let tests = await Test.find({ course: courseId, isActive: true }).sort({ createdAt: -1 });

        if (req.user.role === "teacher") {
            const enrollment = await CourseEnrollment.findOne({ user: req.user._id, course: courseId, role: "teacher" });
            if (!enrollment) return res.status(403).json({ message: "Not assigned to this course" });
        } else if (req.user.role === "student") {
            const enrollment = await CourseEnrollment.findOne({ user: req.user._id, course: courseId, role: "student" });
            if (!enrollment) return res.status(403).json({ message: "Not enrolled in this course" });
            tests = tests.filter(t => t.isPublished);
        }

        await client.set(cacheKey, JSON.stringify(tests), "EX", 300);

        return res.status(200).json({ tests });
    } catch (error) {
        console.error("Get Tests Error:", error);
        return res.status(500).json({ message: "Failed to fetch tests" });
    }
};

export const updateTest = async (req, res) => {
    try {
        const { testId } = req.params;
        const updates = req.body;

        const test = await Test.findById(testId);
        if (!test) return res.status(404).json({ message: "Test not found" });

        if (req.user.role === "teacher") {
            const enrollment = await CourseEnrollment.findOne({ user: req.user._id, course: test.course, role: "teacher" });
            if (!enrollment || test.createdBy.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: "Access denied" });
            }
        } else if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        const updatedTest = await Test.findByIdAndUpdate(testId, { $set: updates }, { new: true });
        
        await client.del(`tests:${test.course}`);

        return res.status(200).json({ message: "Test updated", test: updatedTest });
    } catch (error) {
        console.error("Update Test Error:", error);
        return res.status(500).json({ message: "Failed to update test" });
    }
};

export const deleteTest = async (req, res) => {
    try {
        const { testId } = req.params;

        const test = await Test.findById(testId);
        if (!test) return res.status(404).json({ message: "Test not found" });

        if (req.user.role === "teacher") {
            const enrollment = await CourseEnrollment.findOne({ user: req.user._id, course: test.course, role: "teacher" });
            if (!enrollment || test.createdBy.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: "Access denied" });
            }
        } else if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        test.isActive = false;
        test.isPublished = false;
        await test.save();

        await client.del(`tests:${test.course}`);

        return res.status(200).json({ message: "Test deleted successfully" });
    } catch (error) {
        console.error("Delete Test Error:", error);
        return res.status(500).json({ message: "Failed to delete test" });
    }
};

export const togglePublishTest = async (req, res) => {
    try {
        const { testId } = req.params;

        const test = await Test.findById(testId);
        if (!test) return res.status(404).json({ message: "Test not found" });

        if (req.user.role === "teacher") {
            const enrollment = await CourseEnrollment.findOne({ user: req.user._id, course: test.course, role: "teacher" });
            if (!enrollment || test.createdBy.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: "Access denied" });
            }
        } else if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        test.isPublished = !test.isPublished;
        if (test.isPublished) test.publishedAt = new Date();
        await test.save();

        await client.del(`tests:${test.course}`);

        return res.status(200).json({ message: "Test publish status updated", test });
    } catch (error) {
        console.error("Publish Test Error:", error);
        return res.status(500).json({ message: "Failed to publish test" });
    }
};
