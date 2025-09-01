import express from 'express';
const router = express.Router();
import { getUserProfile, updateUserProfile } from '../controllers/userController.js';
import protect from '../middleware/authMiddleware.js'; // Assuming you have authMiddleware

// Protected Routes
router.get('/profile', protect, getUserProfile);
router.put('/update_profile', protect, updateUserProfile);

export default router; 