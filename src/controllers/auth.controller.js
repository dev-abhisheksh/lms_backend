import mongoose from "mongoose";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";

//Access Token
const generateAccessToken = (user) => {
    return jwt.sign(
        {
            _id: user._id,
            email: user.email,
            username: user.username,
            fullName: user.fullName,
            role: user.role
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1h" }
    )
}

//Refresh Token
const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            _id: user._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" }
    )
}

//Register User
const registerUser = async (req, res) => {
    try {
        const { fullName, username, email, password, role } = req.body;
        if (!fullName || !username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (role === "admin" || role === "manager") {
            return res.status(403).json({ message: "Cannot assign admin & manager role during registration" })
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(409).json({ message: "User already exists. Please login" })
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const createUser = await User.create({
            fullName: fullName.trim(),
            username: username.trim().toLowerCase(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            role
        });

        const user = createUser.toObject();
        delete user.password;

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user)

        createUser.refreshToken = refreshToken
        await createUser.save({ validateBeforeSave: false })

        return res.status(201).json({ message: "User created successfully", user, accessToken, refreshToken })
    } catch (error) {
        console.error("Failed to register user", error.message);
        return res.status(500).json({ message: "Failed to register user" })
    }
}

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" })
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: "User not registered" })
        }

        const isMatchPassword = await bcrypt.compare(password, user.password);
        if (!isMatchPassword) {
            return res.status(401).json({ message: "Invalid user credentials" })
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        user.refreshToken = refreshToken;
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false })

        const noPassUser = user.toObject();
        delete noPassUser.password;

        return res.status(200).json({ message: "User loggedIn successfully", user: noPassUser, accessToken, refreshToken })
    } catch (error) {
        console.error("Failed to login user", error.message);
        return res.status(500).json({ message: "Failed to login user" })
    }
}

export {
    registerUser,
    loginUser
}