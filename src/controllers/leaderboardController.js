import User from '../models/User.js';
import QuizScore from '../models/QuizScore.js';

// @desc    Get leaderboard with user scores
// @route   GET /api/leaderboard
// @access  Public
export const getLeaderboard = async (req, res) => {
    try {
        // Aggregate quiz scores to get average score per user
        const leaderboard = await QuizScore.aggregate([
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
        ]);

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