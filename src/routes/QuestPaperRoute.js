import express from 'express';
import { generateQuestionPaper, submitQuestionPaper } from '../controllers/QuestPaperController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/generate', protect, generateQuestionPaper);
router.post('/submit', protect, submitQuestionPaper);

export default router;
