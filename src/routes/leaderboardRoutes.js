import express from 'express';
import { getLeaderboard } from '../controllers/leaderboardController.js';

const router = express.Router();

// GET /api/leaderboard - Get overall leaderboard
router.get('/', getLeaderboard);

// GET /api/leaderboard/:userId - Get specific user's leaderboard position
router.get('/:userId', getLeaderboard);

export default router; 