import User from '../models/User.js';
import QuizScore from '../models/QuizScore.js';
import mongoose from 'mongoose';

// @desc    Get leaderboard with user scores
// @route   GET /api/leaderboard
// @route   GET /api/leaderboard/:userId
// @access  Public
export const getLeaderboard = async (req, res) => {
    try {
        const { userId } = req.params;

        // Base aggregation pipeline
        const pipeline = [
            {
                $group: {
                    _id: '$userId',
                    averageScore: { $avg: '$score' },
                    totalQuizzes: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'Users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            {
                $unwind: '$userDetails'
            },
            {
                $project: {
                    _id: 1,
                    name: '$userDetails.name',
                    averageScore: { $round: ['$averageScore', 2] },
                    totalQuizzes: 1
                }
            },
            {
                $sort: { averageScore: -1 }
            }
        ];

        // If userId is provided, get specific user's position
        if (userId) {
            // First verify if user exists
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user ID format'
                });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Get user's quiz scores
            const userScores = await QuizScore.find({ userId });
            
            if (!userScores || userScores.length === 0) {
                return res.status(200).json({
                    success: true,
                    data: {
                        userPosition: null,
                        totalUsers: 0,
                        userScore: {
                            _id: userId,
                            name: user.name,
                            averageScore: 0,
                            totalQuizzes: 0,
                            position: null
                        }
                    }
                });
            }

            // Get all scores and find user's position
            const allScores = await QuizScore.aggregate(pipeline);
            const userPosition = allScores.findIndex(score => score._id.toString() === userId) + 1;

            return res.status(200).json({
                success: true,
                data: {
                    userPosition,
                    totalUsers: allScores.length,
                    userScore: {
                        ...allScores.find(score => score._id.toString() === userId),
                        position: userPosition
                    }
                }
            });
        }

        // If no userId provided, return full leaderboard
        const leaderboard = await QuizScore.aggregate(pipeline);

        res.status(200).json({
            success: true,
            data: leaderboard
        });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching leaderboard',
            error: error.message
        });
    }
}; 