// routes/authRoutes.js
import express from "express";
const router = express.Router();
import { register, login, changePassword, forgetPassword, resetPassword } from "../controllers/authController.js";
import protect  from "../middleware/authMiddleware.js";

// Public Routes
router.post("/register", register);
router.post("/login", login);
router.post("/forget-password", forgetPassword);
router.post("/reset-password", resetPassword);

// Protected Routes (require authentication)
router.post("/change-password", protect, changePassword);
router.get("/me", protect, (req, res) => {
  res.json(req.user);
});

export default router;
