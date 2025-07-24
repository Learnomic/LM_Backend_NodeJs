// import express from "express";
// import { 
//   updateVideoProgress, 
//   getVideoProgress,
//   getSpecificVideoProgress 
// } from "../controllers/videoProgressController.js";
// import protect from "../middleware/authMiddleware.js"; 

// const router = express.Router();

// // Update video progress
// router.post("/", protect, updateVideoProgress);

// // Get all video progress for user
// router.get("/", protect, getVideoProgress); 

// // Get progress for specific video
// router.get("/:videoId", protect, getSpecificVideoProgress);

// export default router;
import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  updateVideoProgress,
  getVideoProgress,
} from "../controllers/videoProgressController.js";

const router = express.Router();
// Update video progress
router.put("/", protect, updateVideoProgress);
router.post("/", protect, getVideoProgress); // <-- added


export default router;