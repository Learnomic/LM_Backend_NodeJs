import express from 'express';
const router = express.Router();
import { postSubjects, getChapters, getTopics, getSubtopics, getQuiz, getCompleteContent, getCurriculumBySubjectName, getVideoById, 
    getAvailableBoardsAndGrades, getGradesForBoard, getMediumsForBoard } from '../controllers/curriculumController.js';
import Subject from '../models/Subject.js';

router.get('/available-options', getAvailableBoardsAndGrades);
router.get('/grades/:board', getGradesForBoard);
router.get('/mediums/:board', getMediumsForBoard);

router.get('/content', getCompleteContent);
router.post('/subjects', postSubjects);
router.get('/chapters/:subjectName', getChapters);
router.get('/topics/:chapterId',  getTopics);
router.get('/subtopics/:topicId',  getSubtopics);
// router.get('/videos/:subtopicId', protect, getVideos);
router.get('/video/:videoId',  getVideoById);
router.get('/quiz/:videoId',  getQuiz);

// Get curriculum by subject name - must be last to avoid conflicts
router.get('/subject/:subjectName', getCurriculumBySubjectName);

// Change from GET to POST and update the path
router.post('/subject', getCurriculumBySubjectName);

export default router;