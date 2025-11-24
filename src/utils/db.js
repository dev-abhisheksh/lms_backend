import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const res = await mongoose.connect(`${process.env.MONGO_URI}`);
        console.log(`MongoDB connection established successfully | Connection Host ${res.connection.host}`)
    } catch (error) {
        console.error(`Failed to connect to MongoDB ${error}`)
        process.exit(1);
    }
    
}

export default connectDB;