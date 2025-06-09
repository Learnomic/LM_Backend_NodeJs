import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'learnomic' // Explicitly specify the database name
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Connected Database Name: ${conn.connection.db.databaseName}`);

  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

export default connectDB;
