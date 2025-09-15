import User from '../models/User.js';
import moment from 'moment';
import VideoProgress from '../models/VideoProgressSchema.js';
import VideosQuiz from '../models/VideosQuiz.js';
import { uploadToBlob, deleteFromBlob } from '../config/Azure/azureStore.js';

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let totalAvailableVideos;

    if (['CBSE', 'ICSE'].includes(user.board)) {
      totalAvailableVideos = await VideosQuiz.countDocuments({
        board: user.board,
        grade: user.grade
      });
    } else {
      totalAvailableVideos = await VideosQuiz.countDocuments({
        board: user.board,
        grade: user.grade,
        medium: { $in: user.medium || [] }
      });
    }

    // Streak logic
    const today = moment().startOf('day');
    const lastVisit = user.lastVisited ? moment(user.lastVisited).startOf('day') : null;

    const progress = await VideoProgress.findOne({ userId: user._id });

    const startOfWeek = moment().startOf('week').toDate();
    const endOfWeek = moment().endOf('week').toDate();

    const weeklyTimeSpent = progress?.videoProgress?.reduce((sum, v) => {
      const watched = new Date(v.lastWatched);
      if (watched >= startOfWeek && watched <= endOfWeek) {
        return sum + (v.totalWatchTime || 0);
      }
      return sum;
    }, 0) || 0;

    const completedVideosCount = progress?.videoProgress?.filter(
      (v) => v.isCompleted
    ).length || 0;

    if (!lastVisit || today.diff(lastVisit, 'days') > 1) {
      user.streak = 1;
    } else if (today.diff(lastVisit, 'days') === 1) {
      user.streak += 1;
    }

    if (!lastVisit || today.diff(lastVisit, 'days') >= 1) {
      user.lastVisited = new Date();
      await user.save();
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      board: user.board,
      grade: user.grade,
      medium: user.medium,
      schoolName: user.schoolName,
      profilePicture: user.profilePicture, // This will now be Azure Blob URL
      weeklyTimeSpent,
      completedVideosCount,
      createdAt: user.createdAt,
      streak: user.streak,
      totalAvailableVideos,
    });
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Upload profile picture
// @route   POST /api/user/upload-profile-picture
// @access  Private
const uploadProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Delete old profile picture if exists
    if (user.profilePicture) {
      await deleteFromBlob(user.profilePicture);
    }

    // Upload new profile picture to Azure Blob
    const imageUrl = await uploadToBlob(req.file, user._id);
    
    // Update user profile picture URL in database
    user.profilePicture = imageUrl;
    await user.save();

    res.json({
      message: 'Profile picture uploaded successfully',
      profilePicture: imageUrl
    });

  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete profile picture
// @route   DELETE /api/user/delete-profile-picture
// @access  Private
const deleteProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.profilePicture) {
      return res.status(400).json({ message: 'No profile picture to delete' });
    }

    // Delete from Azure Blob Storage
    await deleteFromBlob(user.profilePicture);
    
    // Remove URL from database
    user.profilePicture = null;
    await user.save();

    res.json({ message: 'Profile picture deleted successfully' });

  } catch (error) {
    console.error('Error deleting profile picture:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @route   PUT /api/user/update_profile
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only update allowed fields (excluding profilePicture as it's handled separately)
    user.name = req.body.name ?? user.name;
    user.board = req.body.board ?? user.board;
    user.grade = req.body.grade ?? user.grade;
    user.medium = req.body.medium ?? user.medium;
    user.schoolName = req.body.schoolName ?? user.schoolName;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      board: updatedUser.board,
      grade: updatedUser.grade,
      medium: updatedUser.medium,
      schoolName: updatedUser.schoolName,
      profilePicture: updatedUser.profilePicture,
      completedVideosCount: updatedUser.completedVideosCount,
      createdAt: updatedUser.createdAt
    });
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @route   GET /api/user/subject-progress
// @access  Private
const getUserSubjectProgress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('board grade medium');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const matchQuery = { board: user.board, grade: user.grade };
    if (!['CBSE', 'ICSE'].includes(user.board)) {
      matchQuery.medium = { $in: user.medium || [] };
    }

    const subjects = await VideosQuiz.aggregate([
      { $match: matchQuery },
      { $group: { _id: "$subName", totalVideos: { $sum: 1 } } },
    ]);

    const progress = await VideoProgress.findOne({ userId: user._id });

    console.log('Subjects:', subjects);

    const subjectProgress = subjects.map((s) => {
      const completed = progress?.videoProgress?.filter(
        (v) => v.isCompleted && v.board === user.board && v.grade === user.grade && v.subName === s._id
      ).length || 0;


      return {
        subject: s._id,
        completedVideos: completed,
        totalVideos: s.totalVideos,
      };
    });

    res.json({ subjects: subjectProgress });
  } catch (error) {
    console.error("Error in getUserSubjectProgress:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// @route   GET /api/user/progress
// @access  Private
const getUserProgress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('board grade medium');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let totalAvailableVideos;
    if (['CBSE', 'ICSE'].includes(user.board)) {
      totalAvailableVideos = await VideosQuiz.countDocuments({
        board: user.board,
        grade: user.grade,
      });
    } else {
      totalAvailableVideos = await VideosQuiz.countDocuments({
        board: user.board,
        grade: user.grade,
        medium: { $in: user.medium || [] },
      });
    }

    const progress = await VideoProgress.findOne({ userId: user._id });

    const completedVideosCount =
      progress?.videoProgress?.filter((v) => v.isCompleted).length || 0;

    const progressPercentage =
      totalAvailableVideos > 0
        ? Math.round((completedVideosCount / totalAvailableVideos) * 100)
        : 0;

    res.json({
      completedVideosCount,
      totalAvailableVideos,
      progressPercentage,
    });
  } catch (error) {
    console.error('Error in getUserProgress:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @route   GET /api/user/study-insights
// @access  Private
const getStudyInsights = async (req, res) => {
  try {
    const userId = req.user._id;
    const progress = await VideoProgress.findOne({ userId });

    if (!progress || !progress.videoProgress.length) {
      return res.json({
        favoriteSubjects: [],
        bestStudyTime: null,
        stats: {},
        message: "No study data yet"
      });
    }

    // ✅ Favorite Subject Calculation
    const subjectCount = {};
    progress.videoProgress.forEach(v => {
      if (v.isCompleted) {
        subjectCount[v.subName] = (subjectCount[v.subName] || 0) + 1;
      }
    });

    const favoriteSubjects = [];
    if (Object.keys(subjectCount).length > 0) {
      const maxCompleted = Math.max(...Object.values(subjectCount));
      Object.keys(subjectCount).forEach(sub => {
        if (subjectCount[sub] === maxCompleted) {
          favoriteSubjects.push(sub);
        }
      });
    }

    // ✅ Best Study Time Calculation
    const timeSlots = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
    progress.videoProgress.forEach(v => {
      if (v.totalWatchTime && v.lastWatched) {
        const hour = new Date(v.lastWatched).getHours();
        if (hour >= 5 && hour < 12) timeSlots.Morning += v.totalWatchTime;
        else if (hour >= 12 && hour < 17) timeSlots.Afternoon += v.totalWatchTime;
        else if (hour >= 17 && hour < 21) timeSlots.Evening += v.totalWatchTime;
        else timeSlots.Night += v.totalWatchTime;
      }
    });

    const bestStudyTime = Object.keys(timeSlots).reduce((a, b) =>
      timeSlots[a] > timeSlots[b] ? a : b
    );

    res.json({
      favoriteSubjects,
      bestStudyTime,
      stats: timeSlots
    });
  } catch (error) {
    console.error("Error in getStudyInsights:", error);
    res.status(500).json({ message: "Server Error" });
  }
};


export { 
  getUserProfile, 
  updateUserProfile, 
  getUserSubjectProgress, 
  getUserProgress,
  uploadProfilePicture,
  deleteProfilePicture,
  getStudyInsights   
};