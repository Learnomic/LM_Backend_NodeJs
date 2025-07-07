import express from 'express';
const router = express.Router();
import { postSubjects, getChapters, getTopics, getSubtopics, getVideos, getQuiz, getCompleteContent, getCurriculumBySubjectName, addVideo, getVideoById, 
    getAvailableBoardsAndGrades, getGradesForBoard, getMediumsForBoard} from '../controllers/curriculumController.js';
import protect from '../middleware/authMiddleware.js'; // Assuming curriculum content access requires authentication
import Subject from '../models/Subject.js';

router.get('/available-options', getAvailableBoardsAndGrades);
router.get('/grades/:board', getGradesForBoard);
router.get('/mediums/:board', getMediumsForBoard);

router.get('/content', protect, getCompleteContent);
router.post('/subjects', postSubjects);
router.get('/chapters/:subjectName', protect, getChapters);
router.get('/topics/:chapterId', protect, getTopics);
router.get('/subtopics/:topicId', protect, getSubtopics);
router.get('/videos/:subtopicId', protect, getVideos);
router.get('/video/:videoId', protect, getVideoById);
router.get('/quiz/:videoId', protect, getQuiz);

//router.post('/admin/curriculum', protect, postCurriculum);
//router.post('/admin/quiz', protect, postQuiz);
router.post('/video', protect, addVideo);

// Get curriculum by subject name - must be last to avoid conflicts
router.get('/subject/:subjectName', getCurriculumBySubjectName);
//router.post('/postCurriculumForm', postCurriculumForm);

// Change from GET to POST and update the path
router.post('/subject', getCurriculumBySubjectName);

export default router;