import jwt from "jsonwebtoken";

const verifyJWT = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" })
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        if (!decoded._id) {
            return res.status(401).json({ message: "Invalid token" })
        }

        req.user = decoded
        next()
    } catch (error) {
        console.error("JWT verification failed:", error.message)
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Access token expired" });
        }
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

export default verifyJWT