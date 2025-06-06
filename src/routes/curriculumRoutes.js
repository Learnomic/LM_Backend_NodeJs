import express from 'express';
const router = express.Router();
import { getSubjects, getChapters, getTopics, getSubtopics, getVideos, getQuiz, postCurriculum, postQuiz, getCompleteContent, getCurriculumBySubjectName, addVideo, postCurriculumForm } from '../controllers/curriculumController.js';
import protect from '../middleware/authMiddleware.js';

// Public Routes
router.get('/content', getCompleteContent);
router.get('/subject/:subjectName', getCurriculumBySubjectName);
router.get('/subjects', getSubjects);
router.get('/chapters', getChapters);
router.get('/topics', getTopics);
router.get('/subtopics', getSubtopics);
router.get('/videos', getVideos);
router.get('/quiz/:videoId', getQuiz);

// Admin Routes (Protected)
router.post('/curriculum', protect, postCurriculum);
router.post('/quiz', protect, postQuiz);
router.post('/video', protect, addVideo);
router.post('/postCurriculumForm', protect, postCurriculumForm);

export default router;