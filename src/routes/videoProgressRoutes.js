import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  updateVideoProgress,
  getVideoProgress,
  getResumeLearningBySubjects,
  getAllVideoProgress,
  getCompletedVideos,
  getRecentlyWatched,
  syncCompletedVideosCount,
  migrateVideoProgressData
} from "../controllers/videoProgressController.js";

const router = express.Router();

// Update video progress
router.put("/", protect, updateVideoProgress);

// Get specific video progress
router.post("/", protect, getVideoProgress); 

// Get resume learning grouped by subjects
router.get('/resume/subject', protect, getResumeLearningBySubjects);

// Get all video progress for a user
router.get('/all', protect, getAllVideoProgress);

// Get completed videos
router.get('/completed', protect, getCompletedVideos);

// Get recently watched videos
router.get('/recent', protect, getRecentlyWatched);

// Sync completed videos count (admin function)
router.post('/sync-completed-count', protect, syncCompletedVideosCount);

// Migration endpoint (run once to migrate from old schema to new schema)
router.post('/migrate', protect, migrateVideoProgressData);

export default router;