import express from "express";
import { 
  updateVideoProgress, 
  getVideoProgress,
  getSpecificVideoProgress 
} from "../controllers/videoProgressController.js";
import protect from "../middleware/authMiddleware.js"; 

const router = express.Router();

// Update video progress
router.post("/", protect, updateVideoProgress);

// Get all video progress for user
router.get("/", protect, getVideoProgress); 

// Get progress for specific video
router.get("/:videoId", protect, getSpecificVideoProgress);

export default router;