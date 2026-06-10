import express from "express"
import cors from "cors"
import dotenv from "dotenv";
import authRouter from "./routes/auth.route.js"
import courseRouter from "./routes/course.route.js"
import enrollmentRouter from "./routes/courseEnrollment.route.js"
import assignmentRouter from "./routes/assignment.route.js"
import submissionRouter from "./routes/submission.route.js"
import departmentRouter from "./routes/department.route.js"
import moduleRouter from "./routes/module.route.js"
import lessonRouter from "./routes/lesson.route.js"
import testRouter from "./routes/test.route.js"
import noteRouter from "./routes/note.route.js"
import aiRouter from "./routes/ai.route.js"
import attendanceRouter from "./routes/attendance.route.js"
import announcementRouter from "./routes/announcement.route.js"
import notificationRouter from "./routes/notification.route.js"
import errorMiddleware from "./middlewares/errorMiddleware.js";

dotenv.config();
const app = express();
app.use(express.json());

const allowedOrigins = [
    "http://localhost:5173",
    "https://lms-frontend-nine-plum.vercel.app"
]

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true)
        if (allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error("Not allowed by CORS"))
        }
    },
    credentials: true
}))

//routes
app.use("/api/v1/auth", authRouter)
app.use("/api/v1/courses", courseRouter)
app.use("/api/v1/enrollments", enrollmentRouter)
app.use("/api/v1/assignments", assignmentRouter)
app.use("/api/v1/submissions", submissionRouter)
app.use("/api/v1/departments", departmentRouter)
app.use("/api/v1/modules", moduleRouter)
app.use("/api/v1/lessons", lessonRouter)
app.use("/api/v1/tests", testRouter)
app.use("/api/v1/notes", noteRouter)
app.use("/api/v1/ai", aiRouter)
app.use("/api/v1/attendance", attendanceRouter)
app.use("/api/v1/announcements", announcementRouter)
app.use("/api/v1/notifications", notificationRouter)

app.use(errorMiddleware)

export default app;