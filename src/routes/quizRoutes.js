import express from 'express';
import { getUserQuizHistory, submitQuiz, getQuizByVideoUrl } from '../controllers/quizController.js';
import protect from '../middleware/authMiddleware.js';
import { submitQuizValidation } from '../middleware/submitQuizValidation.js';

const router = express.Router();

router.post('/submit_quiz', protect, submitQuiz);
router.get('/user/quiz_history', protect, getUserQuizHistory);
router.get('/quiz', getQuizByVideoUrl);


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
