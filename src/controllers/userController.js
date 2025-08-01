import User from '../models/User.js';
import moment from 'moment'; // Add at the top

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 🔥 Streak logic
    const today = moment().startOf('day');
    const lastVisit = user.lastVisited ? moment(user.lastVisited).startOf('day') : null;

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
      totalTimeSpent: user.totalTimeSpent,
      completedVideos: user.completedVideos,
      createdAt: user.createdAt,
      streak: user.streak, // send it to frontend
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
      createdAt: updatedUser.createdAt
    });
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export { getUserProfile, updateUserProfile };
