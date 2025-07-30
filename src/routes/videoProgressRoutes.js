import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  updateVideoProgress,
  getVideoProgress,
  getResumeLearningBySubjects,
} from "../controllers/videoProgressController.js";

const router = express.Router();
// Update video progress
router.put("/", protect, updateVideoProgress);
router.post("/", protect, getVideoProgress); 
router.get('/resume/subject', protect, getResumeLearningBySubjects);


export default router;