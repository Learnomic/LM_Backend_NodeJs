// import asyncHandler from "express-async-handler";
// import mongoose from 'mongoose';

// import User from "../models/User.js"; 

// // @route   POST /api/video-progress
// export const updateVideoProgress = asyncHandler(async (req, res) => {
//   try {
//     const { 
//       videoId, 
//       currentTime, 
//       totalDuration, 
//       progressPercent, 
//       isCompleted,
//       watchTimeIncrement = 0 // Time spent in this session
//     } = req.body;
    
//     const userId = req.user._id;

//     console.log('Request body:', req.body);
//     console.log('User ID:', userId);

//     // Validation
//     if (!videoId) {
//       res.status(400);
//       throw new Error("Missing videoId");
//     }

//     if (currentTime == null && progressPercent == null) {
//       res.status(400);
//       throw new Error("Must provide either currentTime or progressPercent");
//     }

//     const user = await User.findById(userId);
//     if (!user) {
//       res.status(404);
//       throw new Error("User not found");
//     }

//     // Convert videoId to ObjectId
//     let videoIdObj;
//     try {
//       videoIdObj = new mongoose.Types.ObjectId(videoId);
//     } catch (err) {
//       console.error('ObjectId conversion error:', err);
//       res.status(400);
//       throw new Error("Invalid videoId format");
//     }

//     // Find existing progress entry
//     const existingIndex = user.videoProgress.findIndex(entry => 
//       entry.videoId.equals(videoIdObj)
//     );

//     // Calculate progress if not provided
//     let calculatedProgress = progressPercent;
//     if (currentTime != null && totalDuration > 0 && progressPercent == null) {
//       calculatedProgress = Math.min((currentTime / totalDuration) * 100, 100);
//     }

//     // Ensure progress is within bounds
//     const newProgress = Math.min(Math.max(calculatedProgress || 0, 0), 100);
//     const newCurrentTime = Math.max(currentTime || 0, 0);
//     const newTotalDuration = Math.max(totalDuration || 0, 0);
    
//     // Determine if completed
//     const completed = isCompleted !== undefined ? isCompleted : 
//                      (newProgress >= 95 || (newCurrentTime > 0 && newTotalDuration > 0 && newCurrentTime >= newTotalDuration * 0.95));

//     if (existingIndex >= 0) {
//       const existing = user.videoProgress[existingIndex];
      
//       // Only update if new progress is higher or if providing more recent time position
//       const shouldUpdate = newProgress > existing.progressPercent || 
//                           newCurrentTime > existing.currentTime ||
//                           (completed && !existing.isCompleted);

//       if (shouldUpdate) {
//         existing.progressPercent = Math.max(newProgress, existing.progressPercent);
//         existing.currentTime = newCurrentTime;
//         existing.totalDuration = newTotalDuration || existing.totalDuration;
//         existing.isCompleted = completed || existing.isCompleted;
//         existing.totalWatchTime = (existing.totalWatchTime || 0) + watchTimeIncrement;
//         existing.lastWatched = new Date();
        
//         // Don't increment watch count for small updates (< 10 seconds apart)
//         const timeSinceLastWatch = new Date() - new Date(existing.lastWatched);
//         if (timeSinceLastWatch > 10000) { // 10 seconds
//           existing.watchCount = (existing.watchCount || 1) + 1;
//         }
//       } else {
//         // Still update last watched time and watch time even if not progressing
//         existing.lastWatched = new Date();
//         existing.totalWatchTime = (existing.totalWatchTime || 0) + watchTimeIncrement;
//       }
//     } else {
//       // Create new progress entry
//       user.videoProgress.push({
//         videoId: videoIdObj,
//         progressPercent: newProgress,
//         currentTime: newCurrentTime,
//         totalDuration: newTotalDuration,
//         lastWatched: new Date(),
//         isCompleted: completed,
//         watchCount: 1,
//         totalWatchTime: watchTimeIncrement
//       });
//     }

//     // ✅ BONUS: Update completedVideos array if video is newly completed
//     const updatedEntry = user.videoProgress.find(entry => entry.videoId.equals(videoIdObj));
    
//     if (updatedEntry.isCompleted && !user.completedVideos.includes(videoId)) {
//       user.completedVideos.push(videoId);
//       console.log(`Video ${videoId} added to completedVideos array`);
//     }

//     await user.save();

//     console.log('Video progress updated successfully');

//     res.status(200).json({
//       message: "Progress updated successfully",
//       videoProgress: {
//         videoId: updatedEntry.videoId,
//         progressPercent: updatedEntry.progressPercent,
//         currentTime: updatedEntry.currentTime,
//         totalDuration: updatedEntry.totalDuration,
//         lastWatched: updatedEntry.lastWatched,
//         isCompleted: updatedEntry.isCompleted,
//         watchCount: updatedEntry.watchCount,
//         totalWatchTime: updatedEntry.totalWatchTime
//       }
//     });
//   } catch (error) {
//     console.error('Error updating video progress:', error);
//     res.status(500).json({ message: "Internal server error", error: error.message });
//   }
// });

// // @route   GET /api/video-progress
// export const getVideoProgress = asyncHandler(async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { videoId } = req.query; // Optional: get progress for specific video
    
//     const user = await User.findById(userId).select('videoProgress');
    
//     if (!user) {
//       res.status(404);
//       throw new Error("User not found");
//     }

//     let videoProgress = user.videoProgress;

//     // If specific videoId requested, filter for that video
//     if (videoId) {
//       try {
//         const videoIdObj = new mongoose.Types.ObjectId(videoId);
//         videoProgress = user.videoProgress.filter(entry => 
//           entry.videoId.equals(videoIdObj)
//         );
//       } catch (err) {
//         res.status(400);
//         throw new Error("Invalid videoId format");
//       }
//     }

//     res.status(200).json({
//       message: "Video progress retrieved successfully",
//       videoProgress: videoProgress,
//       totalVideos: user.videoProgress.length,
//       completedVideos: user.videoProgress.filter(entry => entry.isCompleted).length
//     });
//   } catch (error) {
//     console.error('Error getting video progress:', error);
//     res.status(500).json({ message: "Internal server error", error: error.message });
//   }
// });

// // @route   GET /api/video-progress/:videoId
// export const getSpecificVideoProgress = asyncHandler(async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { videoId } = req.params;
    
//     const user = await User.findById(userId).select('videoProgress');
    
//     if (!user) {
//       res.status(404);
//       throw new Error("User not found");
//     }

//     let videoIdObj;
//     try {
//       videoIdObj = new mongoose.Types.ObjectId(videoId);
//     } catch (err) {
//       res.status(400);
//       throw new Error("Invalid videoId format");
//     }

//     const videoProgress = user.videoProgress.find(entry => 
//       entry.videoId.equals(videoIdObj)
//     );

//     if (!videoProgress) {
//       return res.status(404).json({
//         message: "No progress found for this video",
//         videoProgress: {
//           videoId: videoIdObj,
//           progressPercent: 0,
//           currentTime: 0,
//           totalDuration: 0,
//           isCompleted: false,
//           watchCount: 0,
//           totalWatchTime: 0
//         }
//       });
//     }

//     res.status(200).json({
//       message: "Video progress retrieved successfully",
//       videoProgress: videoProgress
//     });
//   } catch (error) {
//     console.error('Error getting specific video progress:', error);
//     res.status(500).json({ message: "Internal server error", error: error.message });
//   }
// });








// controllers/userProgressController.js
import User from "../models/User.js";

export const updateVideoProgress = async (req, res) => {
  const userId = req.user._id; // pulled from Protect middleware
  const { videoId, currentTime, isCompleted, sessionWatchTime } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const progress = user.videoProgress.find(
      (p) => p.videoId.toString() === videoId
    );

    if (progress) {
      progress.currentTime = currentTime;
      progress.isCompleted = isCompleted || progress.isCompleted;
      progress.lastWatched = new Date();
      if (sessionWatchTime && sessionWatchTime > 0) {
        progress.totalWatchTime += sessionWatchTime;
      }
    } else {
      user.videoProgress.push({
        videoId,
        currentTime,
        isCompleted,
        lastWatched: new Date(),
        totalWatchTime: sessionWatchTime || currentTime || 0,
      });
    }

    await user.save();
    res.status(200).json({ success: true, videoProgress: user.videoProgress });
  } catch (err) {
    console.error("Error updating video progress:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getVideoProgress = async (req, res) => {
  const userId = req.user._id;
  const { videoId } = req.body;

  if (!videoId) {
    return res.status(400).json({ message: "videoId is required in query" });
  }

  try {
    const user = await User.findById(userId).select("videoProgress");
    if (!user) return res.status(404).json({ message: "User not found" });

    const progress = user.videoProgress.find(
      (p) => p.videoId.toString() === videoId
    );

    if (!progress) {
      // Return default progress instead of 404
      return res.status(200).json({ 
        success: true, 
        progress: {
          videoId: videoId,
          currentTime: 0,
          lastWatched: null,
          isCompleted: false,
          totalWatchTime: 0
        }
      });
    }

    res.status(200).json({ success: true, progress });
  } catch (err) {
    console.error("Error fetching video progress:", err);
    res.status(500).json({ message: "Server error" });
  }
};