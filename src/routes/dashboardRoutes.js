import express from 'express';
import { 
    getUserDashboard, 
    getUserStreak, 
    getUserBadges, 
    getUserAchievements, 
    getFunFacts, 
    getContinueLearning 
} from '../controllers/dashboardController.js';
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

export default router;