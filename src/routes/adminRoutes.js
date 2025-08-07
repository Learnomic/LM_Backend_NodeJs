import express from 'express';
import { getAllUserAnalytics, getSubjectAnalytics } from '../controllers/adminController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/users/analytics', getAllUserAnalytics);
router.get('/subjects/analytics', protect, getSubjectAnalytics);

export default router;