import User from '../models/User.js';
import QuizScore from '../models/QuizScore.js';
import VideoProgress from '../models/VideoProgressSchema.js';

// route /admin/users/analytics
export const getAllUserAnalytics = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    const userAnalytics = await Promise.all(
      users.map(async (user) => {
        const totalQuizzes = await QuizScore.countDocuments({ userId: user._id });

        const videoProgress = await VideoProgress.findOne({ userId: user._id });
        const recentVideos = videoProgress?.getRecentlyWatched(3) || [];

        return {
          id: user._id,
          name: user.name,
          email: user.email,
          board: user.board || "Others", 
          createdAt: user.createdAt,
          lastVisited: user.lastVisited,
          totalQuizzes,
          recentVideos: recentVideos.map(v => ({
            videoId: v.videoId,
            subName: v.subName,
            lastWatched: v.lastWatched,
            isCompleted: v.isCompleted
          }))
        };
      })
    );

    // 👇 aggregate student distribution by board
    const boardDistribution = await User.aggregate([
      { $group: { _id: "$board", count: { $sum: 1 } } }
    ]);

    res.status(200).json({ 
      success: true, 
      users: userAnalytics,
      boardDistribution   // 👈 send along with users
    });
  } catch (err) {
    console.error('Admin analytics fetch error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// route /admin/subjects/analytics
export const getSubjectAnalytics = async (req, res) => {
  try {
// Subject Performance (Quiz-based)
const subjectPerformance = await QuizScore.aggregate([
  {
    $group: {
      _id: {
        board: "$board",
        grade: "$grade",
        subject: "$subjectName"
      },
      totalAttempts: { $sum: 1 },
      avgScore: { $avg: "$score" },
      totalQuestions: { $sum: "$totalQuestions" },
      correctAnswers: { $sum: "$correctAnswers" }
    }
  },
  { $sort: { " _id.board": 1, "_id.grade": 1, totalAttempts: -1 } }
]);

// Video Engagement (per board + grade + subject)
const videoEngagement = await VideoProgress.aggregate([
  { $unwind: "$videoProgress" },
  {
    $group: {
      _id: {
        board: "$videoProgress.board",
        grade: "$videoProgress.grade",
        subject: "$videoProgress.subName"
      },
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