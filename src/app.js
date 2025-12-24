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
import aiRouter from "./routes/ai.route.js"

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",
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
app.use("/api/v1/ai", aiRouter)

export default app;