import express from 'express';
import { generateQuestionPaper, submitQuestionPaperScore } from '../controllers/QuestPaperController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/generate', protect, generateQuestionPaper);
router.post('/submit', protect, submitQuestionPaperScore);

export default router;
