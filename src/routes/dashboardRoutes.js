import express from 'express';
import {
    getUserDashboard,
    getUserStreak,
    getUserAchievements,
    getFunFacts,
    getUserProgress,
    getSubjectProgress,
    getContinueLearning
} from '../controllers/dashboardController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Dashboard routes
router.get('/', getUserDashboard);
router.get('/streak', getUserStreak);
router.get('/achievements', getUserAchievements);
router.get('/fun-facts', getFunFacts);
router.get('/progress', getUserProgress);
router.get('/subject-progress', getSubjectProgress);
router.get('/continue-learning', getContinueLearning);

export default router;