import { Attendance } from "../models/attendance.model.js";
import { CourseEnrollment } from "../models/courseEnrollment.model.js";
import { Course } from "../models/course.model.js";

const markAttendance = async (req, res) => {
    try {
        // Controller Level RBAC
        if (req.user.role !== "teacher" && req.user.role !== "admin") {
            return res.status(403).json({ message: "Only teachers and admins can mark attendance" });
        }

        const { courseId, date, records } = req.body;

        if (!courseId || !date || !records) {
            return res.status(400).json({ message: "courseId, date, and records are required" });
        }

        // Normalize date to YYYY-MM-DD
        const normalizedDate = new Date(date);
        normalizedDate.setHours(0, 0, 0, 0);

        // Check if teacher is enrolled in this course (Extra safety layer)
        if (req.user.role === "teacher") {
            const isTeacher = await CourseEnrollment.findOne({
                user: req.user._id,
                course: courseId,
                role: "teacher"
            });

            if (!isTeacher) {
                return res.status(403).json({ message: "You are not assigned to teach this course" });
            }
        }

        // Find existing attendance for this day or create new
        // Fixed Mongoose deprecation warning: using returnDocument: 'after' instead of new: true
        const attendance = await Attendance.findOneAndUpdate(
            { course: courseId, date: normalizedDate },
            {
                markedBy: req.user._id,
                records: records
            },
            { upsert: true, returnDocument: 'after', runValidators: true }
        );

        return res.status(200).json({
            message: "Attendance marked successfully",
            attendance
        });
    } catch (error) {
        console.error("Failed to mark attendance:", error);
        return res.status(500).json({ message: "Failed to mark attendance" });
    }
};

const getAttendanceByDate = async (req, res) => {
    try {
        // Controller Level RBAC
        if (req.user.role !== "teacher" && req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied. Only teachers and admins can view daily attendance" });
        }

        const { courseId } = req.params;
        const { date } = req.query;

        if (!courseId || !date) {
            return res.status(400).json({ message: "courseId and date are required" });
        }

        const normalizedDate = new Date(date);
        normalizedDate.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            course: courseId,
            date: normalizedDate
        }).populate("records.student", "fullName email username");

        if (!attendance) {
            return res.status(404).json({ message: "No attendance found for this date" });
        }

        return res.status(200).json({
            message: "Attendance fetched successfully",
            attendance
        });
    } catch (error) {
        console.error("Failed to fetch attendance:", error);
        return res.status(500).json({ message: "Failed to fetch attendance" });
    }
};

const getCourseAttendanceReport = async (req, res) => {
    try {
        // Controller Level RBAC
        if (req.user.role !== "teacher" && req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied. Only teachers and admins can view reports" });
        }

        const { courseId } = req.params;

        const attendanceRecords = await Attendance.find({ course: courseId });

        if (attendanceRecords.length === 0) {
            return res.status(200).json({
                message: "No attendance records found",
                report: []
            });
        }

        // Aggregate statistics
        const studentStats = {};

        attendanceRecords.forEach(record => {
            record.records.forEach(entry => {
                const studentId = entry.student.toString();
                if (!studentStats[studentId]) {
                    studentStats[studentId] = {
                        present: 0,
                        absent: 0,
                        late: 0,
                        excused: 0,
                        totalSessions: 0
                    };
                }

                studentStats[studentId][entry.status]++;
                studentStats[studentId].totalSessions++;
            });
        });

        return res.status(200).json({
            message: "Attendance report generated successfully",
            totalClasses: attendanceRecords.length,
            report: studentStats
        });
    } catch (error) {
        console.error("Failed to generate report:", error);
        return res.status(500).json({ message: "Failed to generate report" });
    }
};

const getMyAttendance = async (req, res) => {
    try {
        const { courseId } = req.params;

        const attendance = await Attendance.find({
            course: courseId,
            "records.student": req.user._id
        }).select("date records.$");

        const formattedAttendance = attendance.map(a => ({
            date: a.date,
            status: a.records[0].status,
            remarks: a.records[0].remarks
        }));

        return res.status(200).json({
            message: "Fetched your attendance successfully",
            attendance: formattedAttendance
        });
    } catch (error) {
        console.error("Failed to fetch personal attendance:", error);
        return res.status(500).json({ message: "Failed to fetch personal attendance" });
    }
};

export {
    markAttendance,
    getAttendanceByDate,
    getCourseAttendanceReport,
    getMyAttendance
};
