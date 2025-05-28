import User from '../models/User.js';

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
const getUserProfile = async (req, res) => {
    // The authenticated user's information is available in req.user
    const user = await User.findById(req.user._id).select('-password'); // Exclude password

    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            board: user.board,
            grade: user.grade
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Update user profile
// @route   PUT /api/update_profile
// @access  Private
const updateUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        // Update fields if they are provided in the request body
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.board = req.body.board || user.board;
        user.grade = req.body.grade || user.grade;

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            board: updatedUser.board,
            grade: updatedUser.grade
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

export { getUserProfile, updateUserProfile }; 