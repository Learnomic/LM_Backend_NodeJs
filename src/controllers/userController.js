import User from '../models/User.js';
import moment from 'moment'; // Add at the top
import VideoProgress from '../models/VideoProgressSchema.js';
import Video from '../models/Video.js'; 

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
  // These boards ignore medium
  totalAvailableVideos = await Video.countDocuments({
    board: user.board,
    grade: user.grade
  });
} else {
  // For other boards (e.g., SSC), use medium
  totalAvailableVideos = await Video.countDocuments({
    board: user.board,
    grade: user.grade,
    medium: { $in: user.medium || [] } // ✅ handle array
  });
}

    // 🔥 Streak logic
    const today = moment().startOf('day');
    const lastVisit = user.lastVisited ? moment(user.lastVisited).startOf('day') : null;

    // Inside getUserProfile controller
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
      schoolName: user.schoolName,
      profilePicture: user.profilePicture,
      weeklyTimeSpent,
      completedVideosCount: user.completedVideosCount, // Add the new field
      createdAt: user.createdAt,
      streak: user.streak,
      totalAvailableVideos,
    });
  } catch (error) {
    console.error('Error in getUserProfile:', error);
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

    // Only update allowed fields
    user.name = req.body.name ?? user.name;
    user.board = req.body.board ?? user.board;
    user.grade = req.body.grade ?? user.grade;
    user.schoolName = req.body.schoolName ?? user.schoolName;
    user.profilePicture = req.body.profilePicture ?? user.profilePicture;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      board: updatedUser.board,
      grade: updatedUser.grade,
      schoolName: updatedUser.schoolName,
      profilePicture: updatedUser.profilePicture,
      completedVideosCount: updatedUser.completedVideosCount, // Include in response
      createdAt: updatedUser.createdAt
    });
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export { getUserProfile, updateUserProfile };