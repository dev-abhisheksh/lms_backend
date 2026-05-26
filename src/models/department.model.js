import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },

    description: {
        type: String,
        default: ""
    },

    isActive: {
        type: Boolean,
        default: true
    },
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true })


export const Department = mongoose.model("Department", departmentSchema)