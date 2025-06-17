import express from 'express';
import { generateQuestionPaper, submitQuestionPaper } from '../controllers/QuestPaperController.js';

const router = express.Router();

router.post('/generate', generateQuestionPaper);
router.post('/submit', submitQuestionPaper);

export default router;
