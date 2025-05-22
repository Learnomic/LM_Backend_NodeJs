// routes/authRoutes.js
import express from "express";
const router = express.Router();
import { register, login } from "../controllers/authController.js";
import protect  from "../middleware/authMiddleware.js";

// Public Routes
router.post("/register", register);
router.post("/login", login);

// Example Protected Route
router.get("/me", protect, (req, res) => {
  res.json(req.user);
});

export default router;
