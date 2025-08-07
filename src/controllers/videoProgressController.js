// controllers/videoProgressController.js
import User from "../models/User.js";
import Video from '../models/Video.js';
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

    // Prepare progress data
    const progressData = {
      currentTime,
      isCompleted,
      board,
      grade,
      medium,
    };

    // Handle watch time calculation
    if (existingVideoProgress) {
      if (sessionWatchTime && sessionWatchTime > 0) {
        progressData.totalWatchTime = existingVideoProgress.totalWatchTime + sessionWatchTime;
      } else {
        progressData.totalWatchTime = currentTime || existingVideoProgress.totalWatchTime;
      }
    } else {
      progressData.totalWatchTime = sessionWatchTime || currentTime || 0;
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
      videoProgress: {
        userId,
        videoId,
        ...updatedVideoProgress
      }
    });
  } catch (err) {
    console.error("Error updating video progress:", err);
    res.status(500).json({ message: "Server error" });
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

    if (!userProgress) {
      return res.status(200).json({
        success: true,
        progress: {
          videoId,
          currentTime: 0,
          lastWatched: null,
          isCompleted: false,
          totalWatchTime: 0,
        },
      });
    }

    const videoProgress = userProgress.getVideoProgress(videoId);

    if (!videoProgress) {
      return res.status(200).json({
        success: true,
        progress: {
          videoId,
          currentTime: 0,
          lastWatched: null,
          isCompleted: false,
          totalWatchTime: 0,
        },
      });
    }

    res.status(200).json({ 
      success: true, 
      progress: {
        videoId,
        ...videoProgress.toObject()
      }
    });
  } catch (err) {
    console.error("Error fetching video progress:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Extract YouTube video ID from URL
const extractVideoId = (url) => {
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

// Fetch video duration from YouTube API
const fetchYouTubeDuration = async (videoUrl) => {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) return { duration: null, thumbnail: null };

  const apiKey = process.env.YOUTUBE_API_KEY;

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

    // Sort by lastWatched (most recent first)
    incompleteProgress.sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched));

    // Populate video details
    const populatedProgress = await VideoProgress.populate(userProgress, {
      path: 'videoProgress.videoId',
      model: 'Video'
    });

    const grouped = {};
    
    for (const p of populatedProgress.videoProgress) {
      // Skip if video is completed or has no progress
      if (p.isCompleted || p.currentTime <= 0) continue;
      
      const video = p.videoId;
      if (!video) continue; // Skip if video was deleted
      
      console.log("video :", video);
      
      const subject = video.subName;
      if (!grouped[subject]) grouped[subject] = [];

      const { duration, thumbnail } = await fetchYouTubeDuration(video.videoUrl);
      const progressPercent = duration
        ? Math.round((p.currentTime / duration) * 100)
        : null;

      grouped[subject].push({
        videoId: video._id,
        title: video.title,
        videoUrl: video.videoUrl,
        thumbnail,
        chapterName: video.chapterName,
        topicName: video.topicName,
        subtopicName: video.subtopicName,
        currentTime: p.currentTime,
        totalDuration: duration,
        progressPercent,
        lastWatched: p.lastWatched,
        totalWatchTime: p.totalWatchTime,
        board: p.board,
        grade: p.grade,
        medium: p.medium        
      });
    }

    res.status(200).json({
      success: true,
      resumeBySubject: grouped
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

// Migration function to convert old VideoProgress documents to new VideoProgress format
export const migrateVideoProgressData = async (req, res) => {
  try {
    // This assumes you still have access to the old VideoProgress model for migration
    const VideoProgress = require('../models/VideoProgressSchema.js').default;
    
    const allProgress = await VideoProgress.find({});
    const userProgressMap = new Map();
    
    // Group progress by userId
    for (const progress of allProgress) {
      const userId = progress.userId.toString();
      
      if (!userProgressMap.has(userId)) {
        userProgressMap.set(userId, []);
      }
      
      userProgressMap.get(userId).push({
        videoId: progress.videoId,
        currentTime: progress.currentTime,
        lastWatched: progress.lastWatched,
        isCompleted: progress.isCompleted,
        totalWatchTime: progress.totalWatchTime,
        board: progress.board,
        grade: progress.grade,
        medium: progress.medium
      });
    }
    
    // Create new VideoProgress documents
    let migratedCount = 0;
    for (const [userId, videoProgressArray] of userProgressMap) {
      const existingUserProgress = await VideoProgress.findOne({ userId });
      
      if (!existingUserProgress) {
        await VideoProgress.create({
          userId,
          videoProgress: videoProgressArray,
          lastActivity: new Date()
        });
        migratedCount++;
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Migrated video progress data for ${migratedCount} users`
    });
  } catch (err) {
    console.error("Error migrating video progress data:", err);
    res.status(500).json({ message: "Server error" });
  }
};