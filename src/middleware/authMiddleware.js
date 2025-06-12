// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const secret = process.env.JWT_SECRET?.trim();
      
      if (!secret) {
        throw new Error("JWT_SECRET is not configured");
      }

      // Verify token
      const decoded = jwt.verify(token, secret);

      // Check MongoDB connection
      if (mongoose.connection.readyState !== 1) {
        throw new Error("Database connection not ready");
      }

      // Find user with retry logic
      let retries = 3;
      let user = null;
      
      while (retries > 0) {
        try {
          user = await User.findById(decoded.id).select("-password");
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }

      if (!user) {
        throw new Error("User not found");
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Authentication error:', error.message);
      
      if (error.name === 'JsonWebTokenError') {
        res.status(401).json({ message: "Invalid token" });
      } else if (error.name === 'TokenExpiredError') {
        res.status(401).json({ message: "Token expired" });
      } else if (error.message === "Database connection not ready") {
        res.status(503).json({ message: "Service temporarily unavailable" });
      } else {
        res.status(401).json({ message: "Authentication failed" });
      }
    }
  } else {
    res.status(401).json({ message: "No token provided" });
  }
});

export default protect;

