import express from 'express';
const router = express.Router();
import { createSubject, createChapter, createTopic, createSubtopic, createVideo, createQuiz, getUsers, getUserById, updateUser, deleteUser, getSubjects, getSubjectById, updateSubject, deleteSubject, getChapters, getChapterById, updateChapter, deleteChapter } from '../controllers/adminController.js';
import protect from '../middleware/authMiddleware.js'; // Assuming authentication is required

// Admin Routes (require authentication and admin role)
// Add a middleware here to check for admin role: e.g., router.use(adminMiddleware);

// User Management
router.get('/users', protect, getUsers);
router.get('/users/:id', protect, getUserById);
router.put('/users/:id', protect, updateUser);
router.delete('/users/:id', protect, deleteUser);

// Subject Management
router.get('/subjects', protect, getSubjects);
router.get('/subjects/:id', protect, getSubjectById);
router.put('/subjects/:id', protect, updateSubject);
router.delete('/subjects/:id', protect, deleteSubject);

// Chapter Management
router.get('/chapters', protect, getChapters);
router.get('/chapters/:id', protect, getChapterById);
router.put('/chapters/:id', protect, updateChapter);
router.delete('/chapters/:id', protect, deleteChapter);

// Curriculum Content Creation
router.post('/subjects', protect, createSubject);
router.post('/chapters', protect, createChapter);
router.post('/topics', protect, createTopic);
router.post('/subtopics', protect, createSubtopic);
router.post('/videos', protect, createVideo);
router.post('/quizzes', protect, createQuiz);

export default router; 