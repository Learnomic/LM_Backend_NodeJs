// routes/fcmRoutes.js
import express from 'express';
import { updateFCMToken } from './fcmController.js';
import protect from '../../middleware/authMiddleware.js';

const router = express.Router();

// PUT /api/fcm/token - Update user's FCM token
router.put('/token', protect, updateFCMToken);

export default router;