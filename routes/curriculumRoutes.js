import express from 'express';
const router = express.Router();
import { getSubjects, getCurriculum, getQuiz, postCurriculum, postQuiz } from '../controllers/curriculumController.js';

router.get('/subjects', getSubjects);
router.get('/curriculum/:subjectId', getCurriculum);
router.get('/quiz/:videoId', getQuiz);
// router.post('/submit-quiz', submitQuiz);
router.post('/admin/curriculum', postCurriculum);
router.post('/admin/quiz', postQuiz);

export default router;