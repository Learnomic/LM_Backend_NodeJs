import express from 'express';
const router = express.Router();
import { getSubjects, getChapters, getTopics, getSubtopics, getVideos, getQuiz, getCompleteContent, getCurriculumBySubjectName, addVideo, getVideoById, postCurriculumForm } from '../controllers/curriculumController.js';
import protect from '../middleware/authMiddleware.js'; // Assuming curriculum content access requires authentication
import { validateCurriculumForm } from '../middleware/curriculumValidation.js';

// Public or Protected Routes
router.get('/content', protect, getCompleteContent);
router.get('/subjects', getSubjects);
router.get('/chapters/:subjectName', protect, getChapters);
router.get('/topics/:chapterId', protect, getTopics);
router.get('/subtopics/:topicId', protect, getSubtopics);
router.get('/videos/:subtopicId', protect, getVideos);
router.get('/video/:videoId', protect, getVideoById);
router.get('/quiz/:videoId', protect, getQuiz);

// Admin Routes
//router.post('/admin/curriculum', protect, postCurriculum);
//router.post('/admin/quiz', protect, postQuiz);
router.post('/video', protect, addVideo);
router.post('/postCurriculumForm', validateCurriculumForm, postCurriculumForm);

// Get curriculum by subject name - must be last to avoid conflicts
router.get('/subject/:subjectName', getCurriculumBySubjectName);
//router.post('/postCurriculumForm', postCurriculumForm);


export default router;