import { body } from 'express-validator';
import protect from '../middleware/authMiddleware.js';

export const submitQuizValidation = [
  body('quizId').isString().notEmpty(),
  body('videoId').isString().notEmpty(),
  body('totalQuestions').isInt({ min: 1 }),
  body('correctAnswers').isInt({ min: 0 }),
  body('wrongAnswers').isInt({ min: 0 }),
  body('score').isInt({ min: 0 }),
  body('timeSpent').isInt({ min: 0 }),
  body('answers').isArray().notEmpty(),
  body('answers.*.questionIndex').isInt({ min: 0 }),
  body('answers.*.selectedOption').isString().notEmpty(),
  body('answers.*.isCorrect').isBoolean(),
];