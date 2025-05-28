import express from 'express';
import { getLeaderboard } from '../controllers/leaderboardController.js';

const router = express.Router();

// GET /api/leaderboard - Get leaderboard with user scores
router.get('/', getLeaderboard);

export default router; 