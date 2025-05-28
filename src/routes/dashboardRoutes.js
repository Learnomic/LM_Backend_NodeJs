import express from 'express';
import { 
    getUserDashboard, 
    getUserStreak, 
    getUserBadges, 
    getUserAchievements, 
    getFunFacts, 
    getContinueLearning,
    getUserProgress,
    getSubjectProgress
} from '../controllers/dashboardController.js';
import { getLeaderboard } from '../controllers/quizController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// Main dashboard route - returns all dashboard data
router.get('/dashboard', protect, getUserDashboard);

// Individual dashboard component routes for more granular data fetching
router.get('/dashboard/streak', protect, getUserStreak);
router.get('/dashboard/badges', protect, getUserBadges);
router.get('/dashboard/achievements', protect, getUserAchievements);
router.get('/dashboard/fun-facts', protect, getFunFacts);
router.get('/dashboard/continue-learning', protect, getContinueLearning);

// Leaderboard route under dashboard
router.get('/dashboard/leaderboard/:videoId', protect, getLeaderboard);

// Protected Routes
router.get('/user/achievements', protect, getUserAchievements);
// Add routes for progress and subject progress later

// User specific progress routes (can also be considered part of dashboard)
router.get('/user/progress', protect, getUserProgress);
router.get('/subject_progress', protect, getSubjectProgress);

export default router;