import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

const verifyJWT = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken || req.headers["authorization"]?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decoded._id).select("-password -refreshToken");
    if (!user) return res.status(401).json({ message: "Invalid token" });

    req.user = user; // fresh DB data
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Access token expired" });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default verifyJWT;