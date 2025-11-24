import express from "express"
import dotenv from "dotenv";
import authRouter from "./routes/auth.route.js"
import courseRouter from "./routes/course.route.js"
import enrollmentRouter from "./routes/courseEnrollment.route.js"

dotenv.config();
const app = express();
app.use(express.json());

//routes
app.use("/api/v1/auth", authRouter)
app.use("/api/v1/courses", courseRouter)
app.use("/api/v1/enrollments", enrollmentRouter)

export default app;