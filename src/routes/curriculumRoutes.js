import express from 'express';
const router = express.Router();
import { getSubjects, getChapters, getTopics, getSubtopics, getVideos, getQuiz, postCurriculum, postQuiz, getCompleteContent, getCurriculumBySubjectName, addVideo } from '../controllers/curriculumController.js';
import protect from '../middleware/authMiddleware.js'; // Assuming curriculum content access requires authentication

// Public or Protected Routes (depending on if content is public)
// For now, assuming protected
router.get('/content', protect, getCompleteContent); // New route for complete content
router.get('/subjects', getSubjects); // Removed protect middleware
router.get('/chapters/:subjectName', protect, getChapters);
router.get('/topics/:chapterId', protect, getTopics);
router.get('/subtopics/:topicId', protect, getSubtopics);
router.get('/videos/:subtopicId', protect, getVideos);
// Revert to original route definition to fix startup error
router.get('/quiz/:videoId', protect, getQuiz); // Expect videoId parameter

// Admin Routes
router.post('/admin/curriculum', protect, postCurriculum); // These will need significant changes
router.post('/admin/quiz', protect, postQuiz); // This might need some changes
router.post('/video', protect, addVideo); // New route for adding videos

// @desc    Get curriculum by subject name
// @route   GET /api/curriculum/:subjectName
// @access  Public (or Private if needed)
router.get('/:subjectName', getCurriculumBySubjectName);

export default router;