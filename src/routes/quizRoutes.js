import express from 'express';
import { getUserQuizHistory, getQuizByVideoUrl } from '../controllers/quizController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// Public Routes
router.get('/', getQuizByVideoUrl);

// Protected Routes
router.get('/history', protect, getUserQuizHistory);

export default router;


// import express from 'express';
// import { body } from 'express-validator';
// import { submitQuiz } from '../controllers/quizController.js';

// const router = express.Router();

// router.post(
//   '/submit',
//   [
//     body('quizId').notEmpty().withMessage('quizId is required'),
//     body('userId').notEmpty().withMessage('userId is required'),
//     body('videoId').notEmpty().withMessage('videoId is required'),
//     body('timeSpent').isNumeric().withMessage('timeSpent must be a number'),
//     body('answers').isArray({ min: 1 }).withMessage('answers must be an array'),
//     body('answers.*.questionIndex').isNumeric().withMessage('Invalid question index'),
//     body('answers.*.selectedOption').isString().withMessage('Invalid selected option'),
//   ],
//   submitQuiz
// );

// export default router;
