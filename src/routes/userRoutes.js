import express from 'express';
const router = express.Router();
import { getUserProfile, updateUserProfile, getUserSubjectProgress, getUserProgress } from '../controllers/userController.js';
import protect from '../middleware/authMiddleware.js'; 

// Protected Routes
router.get('/profile', protect, getUserProfile);
router.put('/update_profile', protect, updateUserProfile);
router.get('/progress', protect, getUserProgress);
router.get('/subject-progress', protect, getUserSubjectProgress);

export default router; 