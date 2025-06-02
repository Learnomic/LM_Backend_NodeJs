import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 5,  // Minimum number of connections in the pool
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
      serverSelectionTimeoutMS: 10000, // Keep trying to send operations for 10 seconds
      heartbeatFrequencyMS: 10000, // Check server status every 10 seconds
      retryWrites: true,
      retryReads: true,
    });

    // Set mongoose options
    mongoose.set('bufferCommands', false); // Disable command buffering
    mongoose.set('strictQuery', true); // Enable strict query mode
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Connected Database Name: ${conn.connection.name}`);
  } catch (error) {
    console.error("Database connection failed", error);
    process.exit(1);
  }
};

export default connectDB;
