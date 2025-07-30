// controllers/userProgressController.js
import User from "../models/User.js";
import Video from '../models/Video.js';
import axios from 'axios';
// import dotenv from 'dotenv';
// dotenv.config();

export const updateVideoProgress = async (req, res) => {
  const userId = req.user._id; // pulled from Protect middleware
  const { videoId, currentTime, isCompleted, sessionWatchTime, board, grade, medium  } = req.body;

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

            if (board) progress.board = board;
      if (grade) progress.grade = grade;
      if (medium) progress.medium = medium;


    } else {
      user.videoProgress.push({
        videoId,
        currentTime,
        isCompleted,
        lastWatched: new Date(),
        totalWatchTime: sessionWatchTime || currentTime || 0,
        board,  
        grade,  
        medium  
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

    const user = await User.findById(userId)
      .select('videoProgress')
      .populate('videoProgress.videoId');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const grouped = {};

    const filteredProgress = user.videoProgress
      .filter(p => !p.isCompleted && p.currentTime > 0 && p.videoId)
      .sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched));

    for (const p of filteredProgress) {
      const video = p.videoId;
      console.log("video :", video );
      
      const subject = video.subName;
      if (!grouped[subject]) grouped[subject] = [];

      const {duration, thumbnail} = await fetchYouTubeDuration(video.videoUrl);
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