// routes/authRoutes.js
import express from "express";
const router = express.Router();
import { register, login, changePassword, forgetPassword } from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";
import jwt from "jsonwebtoken";

// Public Routes
router.post("/register", register);
router.post("/login", login);
router.post("/forget-password", forgetPassword);

// Test token verification
router.get("/verify-token", (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: "No token provided" 
            });
        }

        console.log('JWT_SECRET:', process.env.JWT_SECRET);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        res.status(200).json({
            success: true,
            message: "Token is valid",
            decoded: decoded
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({
            success: false,
            message: "Token verification failed",
            error: error.message
        });
    }
});

// Protected Routes (require authentication)
router.post("/change-password", protect, changePassword);
router.get("/me", protect, (req, res) => {
  res.json(req.user);
});

export default router;
