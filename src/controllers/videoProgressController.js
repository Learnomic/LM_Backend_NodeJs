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