import express from 'express';
const router = express.Router();
import { getSubjects, getChapters, getTopics, getSubtopics, getVideos, getQuiz, postCurriculum, postQuiz, getCompleteContent, getCurriculumBySubjectName, addVideo } from '../controllers/curriculumController.js';
import protect from '../middleware/authMiddleware.js';

// Public or Protected Routes
router.get('/content', protect, getCompleteContent);
router.get('/subject/:subjectName', protect, getCurriculumBySubjectName);

// Admin Routes
router.post('/curriculum', protect, postCurriculum);
router.post('/quiz', protect, postQuiz);
router.post('/video', protect, addVideo);

export default router;