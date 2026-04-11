import mongoose from "mongoose";

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn("MONGO_URI not set — skipping database connection.");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");

  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.warn("Server will continue running without database. Proxy features still work.");
  }
}

export default connectDB; 