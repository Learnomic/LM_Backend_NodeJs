import User from '../models/User.js';
import QuizScore from '../models/QuizScore.js';
import VideoProgress from '../models/VideoProgressSchema.js';

export const getAllUserAnalytics = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    const userAnalytics = await Promise.all(
      users.map(async (user) => {
        const totalQuizzes = await QuizScore.countDocuments({ userId: user._id });
        const perfectScores = await QuizScore.countDocuments({
          userId: user._id,
          score: { $eq: 100 }
        });

        const videoProgress = await VideoProgress.findOne({ userId: user._id });
        const recentVideos = videoProgress?.getRecentlyWatched(3) || [];

        return {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          lastVisited: user.lastVisited,
          totalQuizzes,
          perfectScores,
          recentVideos: recentVideos.map(v => ({
            videoId: v.videoId,
            lastWatched: v.lastWatched,
            isCompleted: v.isCompleted
          }))
        };
      })
    );

    res.status(200).json({ success: true, users: userAnalytics });
  } catch (err) {
    console.error('Admin analytics fetch error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Add this new controller function to adminController.js
export const getSubjectAnalytics = async (req, res) => {
  try {
    // Get subject-wise quiz performance
    const subjectPerformance = await QuizScore.aggregate([
      {
        $group: {
          _id: "$subjectName",
          totalAttempts: { $sum: 1 },
          avgScore: { $avg: "$score" },
          perfectScores: { $sum: { $cond: [{ $eq: ["$score", 100] }, 1, 0] } },
          totalQuestions: { $sum: "$totalQuestions" },
          correctAnswers: { $sum: "$correctAnswers" }
        }
      },
      { $sort: { totalAttempts: -1 } }
    ]);

    // Get subject-wise video engagement
    const videoEngagement = await VideoProgress.aggregate([
      { $unwind: "$videoProgress" },
      {
        $group: {
          _id: "$videoProgress.board", // or subject if available
          totalWatched: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$videoProgress.isCompleted", true] }, 1, 0] } },
          avgWatchTime: { $avg: "$videoProgress.totalWatchTime" }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      subjectPerformance,
      videoEngagement
    });
  } catch (err) {
    console.error('Subject analytics fetch error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};