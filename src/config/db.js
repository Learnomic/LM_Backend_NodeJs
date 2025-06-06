import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      serverSelectionTimeoutMS: 30000,
      heartbeatFrequencyMS: 10000,
      retryWrites: false, // Disable retry writes for Azure Cosmos DB
      retryReads: true,
      ssl: true,
      replicaSet: 'globaldb',
      appName: '@learnomicdatabase@',
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Set mongoose options
    mongoose.set('bufferCommands', false);
    mongoose.set('strictQuery', true);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Connected Database Name: ${conn.connection.name}`);
  } catch (error) {
    console.error("Database connection failed", error);
    process.exit(1);
  }
};

export default connectDB;
