// controllers/videoProgressController.js
import User from "../models/User.js";
import VideosQuiz from '../models/VideosQuiz.js';
import axios from 'axios';
import VideoProgress from '../models/VideoProgressSchema.js'; // Updated import

// import dotenv from 'dotenv';
// dotenv.config();

export const updateVideoProgress = async (req, res) => {
  const userId = req.user._id;
  const {
    videoId,
    currentTime,
    isCompleted,
    sessionWatchTime,
    board,
    grade,
    medium,
  } = req.body;

  try {
    // First, get the video from VideosQuiz to get subName and ensure thumbnail/duration
    let video = await VideosQuiz.findById({ _id: videoId });
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Check if thumbnail and totalDuration are missing, if so fetch from YouTube API
    if (!video.thumbnail || !video.totalDuration) {
      console.log("Fetching missing thumbnail/duration from YouTube API for video:", videoId);
      const { duration, thumbnail } = await fetchYouTubeDuration(video.videoUrl);
      
      if (duration !== null || thumbnail !== null) {
        // Update the video with fetched data
        const updateData = {};
        if (thumbnail && !video.thumbnail) updateData.thumbnail = thumbnail;
        if (duration && !video.totalDuration) updateData.totalDuration = duration;
        
        video = await VideosQuiz.findByIdAndUpdate(
          videoId,
          updateData,
          { new: true }
        );
        
        console.log("Updated video with thumbnail/duration:", updateData);
      }
    }

    // Find or create user progress document
    let userProgress = await VideoProgress.findOne({ userId });
    if (!userProgress) {
      userProgress = new VideoProgress({ 
        userId,
        videoProgress: []
      });
    }

    // Check if this video was already completed
    const existingVideoProgress = userProgress.getVideoProgress(videoId);
    const wasAlreadyCompleted = existingVideoProgress?.isCompleted || false;

    // Prepare progress data including subName from VideosQuiz
    const progressData = {
      currentTime,
      isCompleted,
      board,
      grade,
      medium,
      subName: video.subName, // Add subName from VideosQuiz
    };

    // Handle watch time calculation
    if (existingVideoProgress) {
      if (sessionWatchTime && sessionWatchTime > 0) {
        // Calculate delta instead of blindly adding
        const prevSession = existingVideoProgress.sessionWatchTime || 0;
        const increment = sessionWatchTime - prevSession;

        progressData.totalWatchTime =
          existingVideoProgress.totalWatchTime + Math.max(increment, 0);

        // Save latest sessionWatchTime so we know last reported
        progressData.sessionWatchTime = sessionWatchTime;
      } else {
        progressData.totalWatchTime =
          currentTime || existingVideoProgress.totalWatchTime;
      }
    } else {
      progressData.totalWatchTime = sessionWatchTime || currentTime || 0;
      progressData.sessionWatchTime = sessionWatchTime || 0;
    }

    // Update video progress using the helper method
    await userProgress.updateVideoProgress(videoId, progressData);

    // Update user's completed videos count
    if (isCompleted && !wasAlreadyCompleted) {
      // Video was just completed for the first time
      await User.findByIdAndUpdate(
        userId,
        { $inc: { completedVideosCount: 1 } },
        { new: true }
      );
    } else if (!isCompleted && wasAlreadyCompleted) {
      // Video was uncompleted (if your app supports this)
      await User.findByIdAndUpdate(
        userId,
        { $inc: { completedVideosCount: -1 } },
        { new: true }
      );
    }

    // Get the updated progress for response
    const updatedVideoProgress = userProgress.getVideoProgress(videoId);

    res.status(200).json({ 
      success: true, 
      message: "Video progress updated successfully",
    });
  } catch (err) {
    console.error("Error updating video progress:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Extract YouTube video ID from URL
const extractVideoId = (url = "") => {
  if (!url || typeof url !== "string") return null;
  const regex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// Convert ISO 8601 duration to seconds
const parseDuration = (iso) => {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
};

// Fetch video duration and thumbnail from YouTube API
const fetchYouTubeDuration = async (videoUrl) => {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) return { duration: null, thumbnail: null };

  const apiKey = process.env.YOUTUBE_API_KEY;

  try {
    const res = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet,contentDetails',
        id: videoId,
        key: apiKey
      }
    });

    const item = res.data.items?.[0];
    if (!item) return { duration: null, thumbnail: null };

    const duration = parseDuration(item.contentDetails.duration);
    const thumbnail = item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url;

    return { duration, thumbnail };
  } catch (error) {
    console.error("Error fetching YouTube data:", error);
    return { duration: null, thumbnail: null };
  }
};

export const getVideoProgress = async (req, res) => {
  const userId = req.user._id;
  const { videoId } = req.body;

  if (!videoId) {
    return res.status(400).json({ message: "videoId is required" });
  }

  try {
    const userProgress = await VideoProgress.findOne({ userId });

    // Fetch from VideosQuiz
    console.log("Received videoId:", videoId, "Type:", videoId);
    let video = await VideosQuiz.findById({ _id: videoId });
    
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    let totalDuration = video.totalDuration;
    let thumbnail = video.thumbnail;

    // Check if we need to fetch from YouTube API and update VideosQuiz
    if (!totalDuration || !thumbnail) {
      console.log("Missing duration/thumbnail, fetching from YouTube API...");
      const fetchedData = await fetchYouTubeDuration(video.videoUrl);
      
      if (fetchedData.duration !== null || fetchedData.thumbnail !== null) {
        const updateData = {};
        if (!thumbnail && fetchedData.thumbnail) {
          thumbnail = fetchedData.thumbnail;
          updateData.thumbnail = fetchedData.thumbnail;
        }
        if (!totalDuration && fetchedData.duration) {
          totalDuration = fetchedData.duration;
          updateData.totalDuration = fetchedData.duration;
        }
        
        // Update VideosQuiz with fetched data
        if (Object.keys(updateData).length > 0) {
          await VideosQuiz.findByIdAndUpdate(videoId, updateData);
          console.log("Updated VideosQuiz with:", updateData);
        }
      }
    }

    // Get user's progress entry
    let videoProgress = userProgress ? userProgress.getVideoProgress(videoId) : null;

    const progressData = {
      videoId,
      videoUrl: video.videoUrl,
      currentTime: videoProgress?.currentTime || 0,
      lastWatched: videoProgress?.lastWatched || null,
      isCompleted: videoProgress?.isCompleted || false,
      totalWatchTime: videoProgress?.totalWatchTime || 0,
      totalDuration,
      thumbnail,
      progressPercent: totalDuration
        ? Math.round(((videoProgress?.currentTime || 0) / totalDuration) * 100)
        : 0,
    };

    res.status(200).json({ success: true, progress: progressData });
  } catch (err) {
    console.error("Error fetching video progress:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getResumeLearningBySubjects = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find user progress document
    const userProgress = await VideoProgress.findOne({ userId });
    
    if (!userProgress) {
      return res.status(200).json({
        success: true,
        resumeBySubject: {}
      });
    }

    // Filter incomplete videos with some progress
    const incompleteProgress = userProgress.videoProgress.filter(p => 
      !p.isCompleted && p.currentTime > 0
    );

    if (incompleteProgress.length === 0) {
      return res.status(200).json({
        success: true,
        resumeBySubject: {}
      });
    }

    // Sort by lastWatched (most recent first)
    incompleteProgress.sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched));

    // Populate video details
    const populatedProgress = await VideoProgress.populate(userProgress, {
      path: "videoProgress.videoId",
      model: "VideosQuiz",
    });

    const grouped = {};

    for (const p of populatedProgress.videoProgress) {
      if (p.isCompleted || p.currentTime <= 0) continue;

      const video = p.videoId;
      if (!video) continue;

      // Use subName from VideoProgress if available, otherwise from video
      const subject = p.subName || video.subName;
      if (!subject) continue;

      if (!grouped[subject]) grouped[subject] = [];

      let totalDuration = video.totalDuration;
      let thumbnail = video.thumbnail;

      // Check if we need to fetch missing data from YouTube API
      if (!totalDuration || !thumbnail) {
        const fetchedData = await fetchYouTubeDuration(video.videoUrl);
        
        if (fetchedData.duration !== null || fetchedData.thumbnail !== null) {
          const updateData = {};
          if (!thumbnail && fetchedData.thumbnail) {
            thumbnail = fetchedData.thumbnail;
            updateData.thumbnail = fetchedData.thumbnail;
          }
          if (!totalDuration && fetchedData.duration) {
            totalDuration = fetchedData.duration;
            updateData.totalDuration = fetchedData.duration;
          }
          
          // Update VideosQuiz with fetched data
          if (Object.keys(updateData).length > 0) {
            await VideosQuiz.findByIdAndUpdate(video._id, updateData);
          }
        }
      }

      const progressPercent = totalDuration
        ? Math.round((p.currentTime / totalDuration) * 100)
        : null;

      grouped[subject].push({
        videoId: video._id,
        title: video.videoTitle,
        videoUrl: video.videoUrl,
        thumbnail,
        chapterName: video.chapterName,
        topicName: video.topicName,
        subtopicName: video.subtopicName,
        currentTime: p.currentTime,
        totalDuration,
        progressPercent,
        lastWatched: p.lastWatched,
        totalWatchTime: p.totalWatchTime,
        board: p.board,
        grade: p.grade,
        medium: p.medium,
      });
    }

    // Sort subjects by most recent lastWatched timestamp
    // For each subject, find the most recent video's lastWatched time
    const sortedSubjects = Object.keys(grouped).sort((subjectA, subjectB) => {
      const mostRecentA = Math.max(...grouped[subjectA].map(v => new Date(v.lastWatched).getTime()));
      const mostRecentB = Math.max(...grouped[subjectB].map(v => new Date(v.lastWatched).getTime()));
      return mostRecentB - mostRecentA; // Most recent first
    });

    // Create sorted response object
    const sortedResumeBySubject = {};
    sortedSubjects.forEach(subject => {
      // Sort videos within each subject by lastWatched (most recent first)
      sortedResumeBySubject[subject] = grouped[subject].sort((a, b) => 
        new Date(b.lastWatched) - new Date(a.lastWatched)
      );
    });

    res.status(200).json({
      success: true,
      resumeBySubject: sortedResumeBySubject
    });

  } catch (err) {
    console.error("Error in getResumeLearningBySubjects:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all video progress for a user
export const getAllVideoProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const userProgress = await VideoProgress.findOne({ userId })
      .populate('videoProgress.videoId');
    
    if (!userProgress) {
      return res.status(200).json({
        success: true,
        videoProgress: []
      });
    }

    res.status(200).json({
      success: true,
      videoProgress: userProgress.videoProgress
    });
  } catch (err) {
    console.error("Error fetching all video progress:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get completed videos for a user
export const getCompletedVideos = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const userProgress = await VideoProgress.findOne({ userId });
    
    if (!userProgress) {
      return res.status(200).json({
        success: true,
        completedVideos: []
      });
    }

    const completedVideos = userProgress.getCompletedVideos();

    res.status(200).json({
      success: true,
      completedVideos
    });
  } catch (err) {
    console.error("Error fetching completed videos:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get recently watched videos
export const getRecentlyWatched = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 10 } = req.query;
    
    const userProgress = await VideoProgress.findOne({ userId })
      .populate('videoProgress.videoId');
    
    if (!userProgress) {
      return res.status(200).json({
        success: true,
        recentlyWatched: []
      });
    }

    const recentVideos = userProgress.getRecentlyWatched(parseInt(limit));

    res.status(200).json({
      success: true,
      recentlyWatched: recentVideos
    });
  } catch (err) {
    console.error("Error fetching recently watched videos:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Optional: Function to sync completed videos count for existing users
export const syncCompletedVideosCount = async (req, res) => {
  try {
    const users = await User.find({});
    
    for (const user of users) {
      const userProgress = await VideoProgress.findOne({ userId: user._id });
      
      if (userProgress) {
        const completedCount = userProgress.getCompletedVideos().length;
        
        await User.findByIdAndUpdate(user._id, {
          completedVideosCount: completedCount
        });
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Synced completed videos count for ${users.length} users`
    });
  } catch (err) {
    console.error("Error syncing completed videos count:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// // Migration function to convert old VideoProgress documents to new VideoProgress format
// export const migrateVideoProgressData = async (req, res) => {
//   try {
//     // This assumes you still have access to the old VideoProgress model for migration
//     // const OldVideoProgress = OldVideoProgress.default;
    
//     const allProgress = await OldVideoProgress.find({});
//     const userProgressMap = new Map();
    
//     // Group progress by userId
//     for (const progress of allProgress) {
//       const userId = progress.userId.toString();
      
//       if (!userProgressMap.has(userId)) {
//         userProgressMap.set(userId, []);
//       }
      
//       userProgressMap.get(userId).push({
//         videoId: progress.videoId,
//         currentTime: progress.currentTime,
//         lastWatched: progress.lastWatched,
//         isCompleted: progress.isCompleted,
//         totalWatchTime: progress.totalWatchTime,
//         board: progress.board,
//         grade: progress.grade,
//         medium: progress.medium
//       });
//     }
    
//     // Create new VideoProgress documents
//     let migratedCount = 0;
//     for (const [userId, videoProgressArray] of userProgressMap) {
//       const existingUserProgress = await VideoProgress.findOne({ userId });
      
//       if (!existingUserProgress) {
//         await VideoProgress.create({
//           userId,
//           videoProgress: videoProgressArray,
//           lastActivity: new Date()
//         });
//         migratedCount++;
//       }
//     }
    
//     res.status(200).json({
//       success: true,
//       message: `Migrated video progress data for ${migratedCount} users`
//     });
//   } catch (err) {
//     console.error("Error migrating video progress data:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };