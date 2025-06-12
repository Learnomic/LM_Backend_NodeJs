import express from 'express';
import { getUserQuizHistory, getQuizByVideoUrl, generateRandomQuestionPaper, generateSubjectQuestionPaper, submitQuiz, submitTestScore, getTestHistory } from '../controllers/quizController.js';
import protect from '../middleware/authMiddleware.js';
import { submitQuizValidation } from '../middleware/submitQuizValidation.js';

const router = express.Router();

// Debug middleware
router.use((req, res, next) => {
    console.log('Quiz Route accessed:', {
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
        baseUrl: req.baseUrl,
        params: req.params,
        query: req.query,
        url: req.url
    });
    next();
});

// Define routes
router.get('/user/quiz_history', protect, getUserQuizHistory);
router.get('/', getQuizByVideoUrl);
router.get('/question_paper/:subjectName', protect, generateRandomQuestionPaper);
router.get('/subject_question_paper/:subjectName', protect, generateSubjectQuestionPaper);
router.post('/submit_quiz', protect, submitQuiz);
router.post('/submit_test_score', protect, submitTestScore);
router.get('/test_history', protect, getTestHistory);

// Log all registered routes
console.log('Registered Quiz Routes:');
router.stack.forEach(r => {
    if (r.route && r.route.path) {
        console.log(`${Object.keys(r.route.methods)} ${r.route.path}`);
    }
});

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
