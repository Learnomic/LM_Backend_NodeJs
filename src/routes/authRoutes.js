// routes/authRoutes.js
import express from "express";
import { register, login, changePassword, forgetPassword, resetPassword } from "../controllers/authController.js";
import protect  from "../middleware/authMiddleware.js";

const router = express.Router();

// Public Routes
router.post("/register", register);
router.post("/login", login);
router.post("/forget-password", forgetPassword);
router.post("/reset-password", resetPassword);

// Add this to your authRoutes.js temporarily
router.post('/test-email', async (req, res) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: 'Test Email',
            text: 'This is a test email'
        });
        res.send('Email sent successfully');
    } catch (error) {
        console.error('Email test error:', error);
        res.status(500).send('Failed to send email');
    }
});

// Protected Routes (require authentication)
router.post("/change-password", protect, changePassword);
router.get("/me", protect, (req, res) => {
  res.json(req.user);
});

export default router;
