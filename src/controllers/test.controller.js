import { Test } from "../models/test.model.js";
import { Course } from "../models/course.model.js";
import { CourseEnrollment } from "../models/courseEnrollment.model.js";
import { client } from "../utils/redisClient.js";

import { TestSubmission } from "../models/testSubmission.model.js";

export const getTestById = async (req, res) => {
    try {
        const { testId } = req.params;
        const test = await Test.findById(testId).populate("course");
        if (!test) return res.status(404).json({ message: "Test not found" });

        // If student, check enrollment and only return if published
        if (req.user.role === "student") {
            const enrollment = await CourseEnrollment.findOne({ user: req.user._id, course: test.course, role: "student" });
            if (!enrollment) return res.status(403).json({ message: "Not enrolled in this course" });
            if (!test.isPublished) return res.status(403).json({ message: "Test not available" });
        }

        return res.status(200).json({ test });
    } catch (error) {
        console.error("Get Test Error:", error);
        return res.status(500).json({ message: "Failed to fetch test" });
    }
};

export const submitTest = async (req, res) => {
    try {
        const { testId } = req.params;
        const { answers } = req.body; // Array of { questionId, selectedOption }

        const test = await Test.findById(testId);
        if (!test) return res.status(404).json({ message: "Test not found" });

        // Check if already submitted
        const existing = await TestSubmission.findOne({ test: testId, student: req.user._id });
        if (existing) return res.status(400).json({ message: "Test already submitted" });

        let score = 0;
        const evaluatedAnswers = test.questions.map(q => {
            const studentAns = answers.find(a => a.questionId === q._id.toString());
            let isCorrect = false;
            let marksObtained = 0;

            if (q.type === "mcq" && studentAns) {
                const correctOptIndex = q.options.findIndex(o => o.isCorrect);
                if (studentAns.selectedOption === correctOptIndex) {
                    isCorrect = true;
                    marksObtained = q.marks;
                    score += q.marks;
                }
            }
            // Add other types (obt, essay) logic if needed. Essay requires teacher grading.

            return {
                questionId: q._id,
                selectedOption: studentAns?.selectedOption,
                isCorrect,
                marksObtained
            };
        });

        const submission = await TestSubmission.create({
            test: testId,
            student: req.user._id,
            answers: evaluatedAnswers,
            score,
            totalMarks: test.totalMarks,
            status: test.type === "essay" || test.type === "mixed" ? "submitted" : "graded"
        });

        return res.status(201).json({ message: "Test submitted successfully", submission });
    } catch (error) {
        console.error("Submit Test Error:", error);
        return res.status(500).json({ message: "Failed to submit test" });
    }
};

export const getMyTestSubmissions = async (req, res) => {
    try {
        const submissions = await TestSubmission.find({ student: req.user._id })
            .populate("test", "title totalMarks duration type course")
            .sort({ createdAt: -1 });
        return res.status(200).json({ submissions });
    } catch (error) {
        console.error("Get My Submissions Error:", error);
        return res.status(500).json({ message: "Failed to fetch submissions" });
    }
};

export const createTest = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { title, description, type, duration, totalQuestions, totalMarks, passingMarks, isPublished, questions } = req.body;

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
            totalQuestions: Number(totalQuestions) || questions?.length || 0,
            totalMarks: Number(totalMarks),
            passingMarks: Number(passingMarks),
            isPublished: Boolean(isPublished),
            publishedAt: isPublished ? new Date() : null,
            course: courseId,
            createdBy: req.user._id,
            questions: questions || []
        });

        await client.del(`tests:${courseId}`);

        // Emit real-time notification if published
        if (test.isPublished && global.io) {
            global.io.to(`course-${courseId}`).emit("test:published", {
                message: `New test published: ${test.title}`,
                test
            });
        }

        return res.status(201).json({ message: "Test created successfully", test });
    } catch (error) {
        console.error("Create Test Error:", error);
        return res.status(500).json({ message: "Failed to create test" });
    }
};

export const getTestsByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;

        const cacheKey = `tests:${courseId}`;
        const cached = await client.get(cacheKey);

        let tests;
        if (cached) {
            tests = JSON.parse(cached);
        } else {
            const course = await Course.findById(courseId).populate("department");
            if (!course) return res.status(404).json({ message: "Course not found" });

            tests = await Test.find({ course: courseId, isActive: true }).sort({ createdAt: -1 });
            await client.set(cacheKey, JSON.stringify(tests), "EX", 300);
        }

        // Apply role-based filtering and authorization in memory
        if (req.user.role === "teacher") {
            const enrollment = await CourseEnrollment.findOne({ user: req.user._id, course: courseId, role: "teacher" });
            if (!enrollment) return res.status(403).json({ message: "Not assigned to this course" });
            // Teachers see all tests
            return res.status(200).json({ tests });
        } else if (req.user.role === "student") {
            const enrollment = await CourseEnrollment.findOne({ user: req.user._id, course: courseId, role: "student" });
            if (!enrollment) return res.status(403).json({ message: "Not enrolled in this course" });
            // Students only see published tests
            const publishedTests = tests.filter(t => t.isPublished);
            return res.status(200).json({ tests: publishedTests });
        } else if (req.user.role === "admin") {
            return res.status(200).json({ tests });
        }

        return res.status(403).json({ message: "Access denied" });
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

        // Emit real-time update
        if (global.io) {
            const roomName = `course-${test.course.toString()}`;
            global.io.to(roomName).emit("test:updated", {
                message: `Test updated: ${updatedTest.title}`,
                test: updatedTest
            });
        }

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

        // Emit real-time deletion
        if (global.io) {
            const roomName = `course-${test.course.toString()}`;
            global.io.to(roomName).emit("test:deleted", {
                message: `Test removed: ${test.title}`,
                testId: test._id
            });
        }

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
        if (test.isPublished) {
            test.publishedAt = new Date();
            if (global.io) {
                const roomName = `course-${test.course.toString()}`;
                global.io.to(roomName).emit("test:published", {
                    message: `New test published: ${test.title}`,
                    test
                });
            }
        } else {
            if (global.io) {
                const roomName = `course-${test.course.toString()}`;
                global.io.to(roomName).emit("test:unpublished", {
                    message: `Test moved to draft: ${test.title}`,
                    testId: test._id
                });
            }
        }
        await test.save();

        await client.del(`tests:${test.course}`);

        return res.status(200).json({ message: "Test publish status updated", test });
    } catch (error) {
        console.error("Publish Test Error:", error);
        return res.status(500).json({ message: "Failed to publish test" });
    }
};
