// routes/notificationRoutes.js
import express from 'express';
import { sendNotification, getNotificationHistory } from './notificationController.js';
import protect from '../../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/notifications/send - Send notification to users
router.post('/send', sendNotification);

// GET /api/notifications/history - Get notification history (protected route)
router.get('/history', protect, getNotificationHistory);

export default router;