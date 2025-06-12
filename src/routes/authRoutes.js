// routes/authRoutes.js
import express from "express";
import { register, login, changePassword, forgetPassword, resetPassword } from "../controllers/authController.js";
import { googleSignIn } from "../controllers/googleAuthController.js";
import protect  from "../middleware/authMiddleware.js";

const router = express.Router();

// Public Routes
router.post("/register", register);
router.post("/login", login);
router.post("/forget-password", forgetPassword);
router.post("/reset-password", resetPassword);
router.post("/google-signin", googleSignIn);

// Protected Routes (require authentication)
router.post("/change-password", protect, changePassword);
router.get("/me", protect, (req, res) => {
  res.json(req.user);
});

export default router;
