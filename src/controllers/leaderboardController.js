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
        const limit = parseInt(req.query.limit) || 10;
        const skip = parseInt(req.query.skip) || 0;

        // Base aggregation pipeline with optimized stages
        const pipeline = [
            {
                $match: {
                    completed: true // Only include completed quizzes
                }
            },
            {
                $group: {
                    _id: '$userId',
                    averageScore: { $avg: '$score' },
                    totalQuizzes: { $sum: 1 },
                    lastQuizDate: { $max: '$createdAt' }
                }
            },
            {
                $lookup: {
                    from: 'Users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userDetails',
                    pipeline: [
                        {
                            $project: {
                                name: 1,
                                email: 1,
                                board: 1,
                                grade: 1
                            }
                        }
                    ]
                }
            },
            {
                $unwind: '$userDetails'
            },
            {
                $project: {
                    _id: 1,
                    name: '$userDetails.name',
                    email: '$userDetails.email',
                    board: '$userDetails.board',
                    grade: '$userDetails.grade',
                    averageScore: { $round: ['$averageScore', 2] },
                    totalQuizzes: 1,
                    lastQuizDate: 1
                }
            },
            {
                $sort: { 
                    averageScore: -1,
                    totalQuizzes: -1,
                    lastQuizDate: -1
                }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            }
        ];

        // If userId is provided, add a match stage at the beginning
        if (userId) {
            pipeline.unshift({
                $match: {
                    userId: new mongoose.Types.ObjectId(userId)
                }
            });
        }

        const leaderboard = await QuizScore.aggregate(pipeline);

        // Get total count for pagination
        const totalCount = await QuizScore.aggregate([
            {
                $match: {
                    completed: true
                }
            },
            {
                $group: {
                    _id: '$userId'
                }
            },
            {
                $count: 'total'
            }
        ]);

        res.status(200).json({
            success: true,
            data: leaderboard,
            pagination: {
                total: totalCount[0]?.total || 0,
                limit,
                skip
            }
        });
    } catch (error) {
        console.error('Leaderboard fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leaderboard',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}; 