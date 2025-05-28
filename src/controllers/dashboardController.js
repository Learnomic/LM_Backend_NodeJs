import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import { ACHIEVEMENTS } from '../constants/rewards.js';
import QuizScore from '../models/QuizScore.js';
import mongoose from 'mongoose';
import Subject from '../models/Subject.js';
import Chapter from '../models/Chapter.js';
import Topic from '../models/Topic.js';
import Subtopic from '../models/Subtopic.js';
import Video from '../models/Video.js';

// Define achievement thresholds (Example - adjust based on your requirements)
const ACHIEVEMENT_THRESHOLDS = {
    FIRST_STEPS: { description: 'Complete your first quiz', threshold: 1, unit: 'quiz' },
    QUIZ_APPRENTICE: { description: 'Complete 10 quizzes', threshold: 10, unit: 'quizzes' },
    QUIZ_MASTER: { description: 'Complete 50 quizzes', threshold: 50, unit: 'quizzes' },
    PERFECT_SCORE: { description: 'Achieve 100% on a quiz', threshold: 1, unit: 'perfect score' }, // Threshold 1 means at least one perfect score
    HIGH_PERFORMER: { description: 'Achieve an average score of 80% or higher', threshold: 80, unit: 'average score' }, // Threshold 80 means 80% average
    WEEKLY_WARRIOR: { description: 'Maintain a 7-day learning streak', threshold: 7, unit: 'days' }, // Threshold 7 means 7-day streak
    // Add other achievements here
};

// Get complete dashboard data
export const getUserDashboard = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    try {
        console.log('Fetching dashboard data for user:', userId);

        // Fetch all required data in parallel for better performance
        const [
            quizScoresCurrentUser,
            subjectProgress,
            user
        ] = await Promise.all([
            // Fetch quiz scores for the current user
            QuizScore.find({ userId: userId }).sort({ createdAt: -1 }),
            // Execute aggregation for subject progress
            QuizScore.aggregate([
                { $match: { userId: new mongoose.Types.ObjectId(userId) } },
                { $group: {
                    _id: "$subjectId",
                    subjectName: { $first: "$subjectName" },
                    totalQuizzes: { $sum: 1 },
                    averageScore: { $avg: "$score" },
                    totalTimeSpent: { $sum: "$timeSpent" },
                    completedTopics: { $addToSet: "$topicId" }
                }}
            ]),
            User.findById(userId)
        ]).catch(error => {
            console.error('Error in Promise.all:', error);
            throw error;
        });

        console.log('Successfully fetched initial data');
        console.log('Quiz scores current user count:', quizScoresCurrentUser.length);
        console.log('Subject progress count:', subjectProgress.length);
        console.log('User found:', !!user);

        // Calculate quiz statistics using quizScoresCurrentUser
        const totalQuizzes = quizScoresCurrentUser.length;
        const scores = quizScoresCurrentUser.map(q => q.score || 0);
        const highestScore = totalQuizzes > 0 ? Math.max(...scores) : 0;
        const averageScore = totalQuizzes > 0 
            ? Math.round(scores.reduce((sum, score) => sum + score, 0) / totalQuizzes * 100) / 100
            : 0;

        // Get completed videos
        const completedVideos = user?.completedVideos?.length || 0;

        // Prepare chart data
        const chartData = {
            scoreDistribution: {
                low: quizScoresCurrentUser.filter(q => q.score < 50).length,
                mid: quizScoresCurrentUser.filter(q => q.score >= 50 && q.score < 80).length,
                high: quizScoresCurrentUser.filter(q => q.score >= 80).length,
            },
            quizzesBySubject: quizScoresCurrentUser.reduce((acc, q) => {
                const subject = q.subjectName || 'Unknown';
                acc[subject] = (acc[subject] || 0) + 1;
                return acc;
            }, {}),
            performanceOverTime: quizScoresCurrentUser.slice(-10).map(q => ({
                date: q.createdAt,
                score: q.score,
                subject: q.subjectName
            })),
            subjectPerformance: subjectProgress
        };

        // Get recent quiz history
        const recentQuizHistory = quizScoresCurrentUser.slice(0, 5).map(quiz => ({
            id: quiz._id,
            subject: quiz.subjectName,
            score: quiz.score,
            totalQuestions: quiz.totalQuestions,
            correctAnswers: quiz.correctAnswers,
            timeTaken: quiz.timeSpent,
            date: quiz.createdAt,
            topic: quiz.topicName,
            subtopic: quiz.subtopicName
        }));

        // Calculate achievements progress
        const achievementsWithProgress = Object.keys(ACHIEVEMENT_THRESHOLDS).map(key => {
            const achievement = ACHIEVEMENT_THRESHOLDS[key];
            let progress = 0;
            let current = 0;

            switch (key) {
                case 'FIRST_STEPS':
                case 'QUIZ_APPRENTICE':
                case 'QUIZ_MASTER':
                    current = quizScoresCurrentUser.length;
                    progress = Math.min(current / achievement.threshold, 1) * 100;
                    break;
                case 'PERFECT_SCORE':
                    current = quizScoresCurrentUser.filter(qs => qs.score === 100).length;
                    progress = current >= achievement.threshold ? 100 : 0;
                    break;
                case 'HIGH_PERFORMER':
                    current = averageScore;
                    progress = Math.min(averageScore / achievement.threshold, 1) * 100;
                    break;
                case 'WEEKLY_WARRIOR':
                    current = user?.currentStreak || 0;
                    progress = Math.min(current / achievement.threshold, 1) * 100;
                    break;
            }

            return {
                name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                description: achievement.description,
                progress: Math.round(progress),
                current: current,
                threshold: achievement.threshold,
                unit: achievement.unit,
                completed: current >= achievement.threshold,
            };
        });

        // Format fun facts
        const formattedFunFacts = [ // Static fun facts
            { id: 1, text: "Did you know? The average human attention span is shorter than a goldfish's! Keep practicing!", category: "General", icon: "💡" },
            { id: 2, text: "Solving quizzes boosts your brainpower by making new connections!", category: "Learning", icon: "🧠" },
            { id: 3, text: "Regular practice, even short sessions, is more effective than cramming.", category: "Study Tips", icon: "📚" },
            { id: 4, text: "Teaching others is a great way to solidify your own understanding.", category: "Study Tips", icon: "🤝" },
            { id: 5, text: "Challenge yourself with topics you find difficult – that's where the biggest growth happens!", category: "Motivation", icon: "💪" }
        ];

        // Format subject progress (assuming subjectProgress is already in desired format from aggregation)
        const formattedSubjectProgress = subjectProgress.map(sp => ({
            subjectId: sp._id,
            subjectName: sp.subjectName,
            totalQuizzes: sp.totalQuizzes,
            averageScore: sp.averageScore,
            totalTimeSpent: sp.totalTimeSpent,
            completedTopics: sp.completedTopics
        }));

        // Combine all data into a single response
        const dashboardData = {
            averageScore,
            highestScore,
            completedVideos,
            totalQuizzes,
            achievements: achievementsWithProgress,
            funFacts: formattedFunFacts,
            chartData,
            subjectProgress: formattedSubjectProgress,
            recentQuizHistory,
            userStats: {
                totalTimeSpent: user?.totalTimeSpent || 0,
                currentStreak: user?.currentStreak || 0,
                longestStreak: user?.longestStreak || 0,
                totalPointsEarned: user?.totalPoints || 0,
                level: user?.level || 1,
                experience: user?.experience || 0
            }
        };

        console.log('Successfully prepared dashboard data');

        res.status(200).json({
            success: true,
            message: 'Dashboard data retrieved successfully',
            data: dashboardData,
        });

    } catch (error) {
        console.error('Dashboard data fetch error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard data', error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' });
    }
});

// Get user's learning streak
export const getUserStreak = asyncHandler(async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const streak = await calculateStreak(user);
        res.status(200).json({
            success: true,
            data: { streak }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user streak',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get user's achievements
export const getUserAchievements = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;

        // Fetch all quiz scores for the user to calculate achievement progress
        const quizScores = await QuizScore.find({ userId: userId });

        // Fetch user details for streak calculation (if needed for achievements)
        const user = await User.findById(userId); // Fetch user to potentially get streak data if stored

        // Calculate progress for each achievement
        const achievementsWithProgress = Object.keys(ACHIEVEMENT_THRESHOLDS).map(key => {
            const achievement = ACHIEVEMENT_THRESHOLDS[key];
            let progress = 0;
            let current = 0;

            switch (key) {
                case 'FIRST_STEPS':
                case 'QUIZ_APPRENTICE':
                case 'QUIZ_MASTER':
                    current = quizScores.length;
                    progress = Math.min(current / achievement.threshold, 1) * 100;
                    break;
                case 'PERFECT_SCORE':
                    current = quizScores.filter(qs => qs.score === 100).length;
                     // For a binary achievement (achieved or not), progress is 100% if current >= threshold
                    progress = current >= achievement.threshold ? 100 : 0;
                    break;
                case 'HIGH_PERFORMER':
                    const totalScores = quizScores.reduce((sum, qs) => sum + qs.score, 0);
                    const averageScore = quizScores.length > 0 ? totalScores / quizScores.length : 0;
                    current = averageScore; // Current is the average score
                     // Progress based on average score towards the threshold
                    progress = Math.min(averageScore / achievement.threshold, 1) * 100;
                    break;
                 case 'WEEKLY_WARRIOR':
                    // This requires proper streak calculation logic, placeholder for now
                    const currentStreak = 0; // Replace with actual streak calculation
                    current = currentStreak;
                    progress = Math.min(currentStreak / achievement.threshold, 1) * 100;
                     break;
                // Add cases for other achievements
            }

            return {
                name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Format key as a readable name
                description: achievement.description,
                progress: Math.round(progress), // Round progress to nearest integer
                current: current, // Include current value for display like 10/10
                threshold: achievement.threshold,
                unit: achievement.unit,
                completed: current >= achievement.threshold, // Determine if achievement is completed
            };
        });

        res.status(200).json({
            success: true,
            count: achievementsWithProgress.length,
            data: achievementsWithProgress
        });
    } catch (error) {
        console.error('Error fetching user achievements:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user achievements',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get fun facts about user's learning journey
export const getFunFacts = asyncHandler(async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const funFacts = await generateFunFacts(user);
        res.status(200).json({
            success: true,
            data: { funFacts }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch fun facts',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get user overall progress
// @route   GET /api/user/progress
// @access  Private
export const getUserProgress = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;

        // Fetch relevant data for progress calculation
        const quizScores = await QuizScore.find({ userId: userId });
        const user = await User.findById(userId).select('completedVideos'); // Assuming completedVideos is on User model

        // Calculate quiz statistics
        const totalQuizzes = quizScores.length;
        const scores = quizScores.map(qs => qs.score || 0);
        const averageScore = totalQuizzes > 0
            ? Math.round(scores.reduce((sum, score) => sum + score, 0) / totalQuizzes * 100) / 100
            : 0;
        const highestScore = totalQuizzes > 0 ? Math.max(...scores) : 0;

        // Get completed videos (adjust based on how you track this - currently a placeholder)
        const completedVideos = user?.completedVideos?.length || 0; // Example: if User model has completedVideos array

        // Calculate streak (This is a simplified example, needs proper streak tracking logic)
        // A more robust streak requires tracking daily activity timestamps.
        const currentStreak = 0; // Placeholder - implement actual streak calculation

        res.status(200).json({
            success: true,
            data: {
                totalQuizzes,
                averageScore,
                highestScore,
                completedVideos,
                currentStreak,
                // Add other overall progress data here
            }
        });

    } catch (error) {
        console.error('Error fetching user progress:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user progress',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get user subject-wise progress
// @route   GET /api/subject_progress
// @access  Private
export const getSubjectProgress = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;

        // Fetch quiz scores for the user, grouped by subject
        const subjectProgressData = await QuizScore.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $group: {
                _id: "$subjectId",
                totalQuizzes: { $sum: 1 },
                averageScore: { $avg: "$score" },
                totalTimeTaken: { $sum: { $toInt: "$timeTaken" } }
            }},
            { $lookup: {
                from: 'subjects',
                localField: '_id',
                foreignField: '_id',
                as: 'subjectDetails'
            }},
            { $unwind: '$subjectDetails' },
            { $project: {
                _id: 0,
                subjectId: '$_id',
                subjectName: '$subjectDetails.subject',
                totalQuizzes: 1,
                averageScore: { $round: ['$averageScore', 2] },
                totalTimeTaken: 1
            }}
        ]);

        res.status(200).json({
            success: true,
            count: subjectProgressData.length,
            data: subjectProgressData
        });

    } catch (error) {
        console.error('Error fetching subject progress:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subject progress',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Suggest the next topic or video for the user to continue learning
// @route   GET /api/dashboard/continue-learning
// @access  Private
export const getContinueLearning = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    console.log('Finding continue learning content for user:', userId);

    try {
        // 1. Get all videos that the user has attempted quizzes for
        const attemptedVideoIds = await QuizScore.find({ userId: userId }).distinct('videoId');
        console.log('Attempted video IDs:', attemptedVideoIds);

        // 2. Find a video that hasn't been attempted yet
        const nextVideo = await Video.findOne({
            _id: { $nin: attemptedVideoIds }
        }).lean();
        console.log('Next video found:', nextVideo);

        if (nextVideo) {
            // 3. Get the curriculum path for this video
            const [subject, chapter, topic, subtopic] = await Promise.all([
                Subject.findOne({ subject: nextVideo.subName }).lean(),
                Chapter.findOne({ chapter_name: nextVideo.chapterName }).lean(),
                Topic.findOne({ topicName: nextVideo.topicName }).lean(),
                Subtopic.findOne({ subtopic_name: nextVideo.subtopicName }).lean()
            ]);
            console.log('Curriculum path:', { subject, chapter, topic, subtopic });

            // 4. Get user's performance in this subject if they have any
            const subjectPerformance = await QuizScore.aggregate([
                { $match: { 
                    userId: new mongoose.Types.ObjectId(userId),
                    subjectId: subject?._id 
                }},
                { $group: {
                    _id: null,
                    averageScore: { $avg: "$score" },
                    totalQuizzes: { $sum: 1 }
                }}
            ]);
            console.log('Subject performance:', subjectPerformance);

            const nextContent = {
                type: 'video',
                videoId: nextVideo._id,
                videoUrl: nextVideo.video_url,
                title: nextVideo.title || `Video on ${subtopic?.subtopic_name || topic?.topic_name || 'a topic'}`,
                curriculumPath: {
                    subject: subject?.subject,
                    chapter: chapter?.chapter_name,
                    topic: topic?.topic_name,
                    subtopic: subtopic?.subtopic_name
                },
                subjectPerformance: subjectPerformance[0] ? {
                    averageScore: Math.round(subjectPerformance[0].averageScore * 100) / 100,
                    totalQuizzes: subjectPerformance[0].totalQuizzes
                } : null
            };

            res.status(200).json({
                success: true,
                message: 'Suggested content for you to continue learning:',
                data: nextContent
            });
        } else {
            // If no unattempted videos found, find the subject with lowest performance
            const subjectPerformance = await QuizScore.aggregate([
                { $match: { userId: new mongoose.Types.ObjectId(userId) } },
                { $group: {
                    _id: "$subjectId",
                    subjectName: { $first: "$subjectName" },
                    averageScore: { $avg: "$score" },
                    totalQuizzes: { $sum: 1 }
                }},
                { $sort: { averageScore: 1 } },
                { $limit: 1 }
            ]);
            console.log('Subject performance for review:', subjectPerformance);

            // Check if there are any videos in the database
            const totalVideos = await Video.countDocuments();
            console.log('Total videos in database:', totalVideos);

            if (subjectPerformance.length > 0) {
                const subject = subjectPerformance[0];
                res.status(200).json({
                    success: true,
                    message: `You've completed all available videos. Consider reviewing ${subject.subjectName} where your average score is ${Math.round(subject.averageScore * 100) / 100}% across ${subject.totalQuizzes} quizzes.`,
                    data: {
                        type: 'review',
                        subject: {
                            name: subject.subjectName,
                            averageScore: Math.round(subject.averageScore * 100) / 100,
                            totalQuizzes: subject.totalQuizzes
                        }
                    }
                });
            } else {
                res.status(200).json({
                    success: true,
                    message: 'No learning history found. Start your learning journey!',
                    data: null
                });
            }
        }

    } catch (error) {
        console.error('Error fetching continue learning content:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch continue learning content',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Helper functions
const calculateStreak = async (user) => {
    const lastActivity = user.lastActive || new Date();
    const today = new Date();
    const diffDays = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
    
    return diffDays <= 1 ? (user.currentStreak || 0) : 0;
};

const calculatePercentile = (user) => {
    // This is a placeholder - implement based on your actual user ranking logic
    return Math.floor(Math.random() * 30) + 70; // Returns 70-99
};

const generateFunFacts = async (user) => {
    try {
        const quizHistory = await QuizScore.find({ user: user._id });
        const totalMinutes = Math.round((user.totalTimeSpent || 0) / 60);
        const totalQuizzes = quizHistory.length;
        const averageScore = totalQuizzes > 0 
            ? Math.round(quizHistory.reduce((sum, q) => sum + q.score, 0) / totalQuizzes)
            : 0;

        return [
            `You've spent ${totalMinutes} minutes learning - that's dedication!`,
            `You're in the top ${calculatePercentile(user)}% of active learners`,
            `You've mastered ${user.masteredTopics?.length || 0} topics so far`,
            `Your average quiz score is ${averageScore}% - keep it up!`,
            `You've completed ${totalQuizzes} quizzes on your learning journey`
        ];
    } catch (error) {
        console.error('Error generating fun facts:', error);
        return [
            "You're making great progress on your learning journey!",
            "Every quiz completed is a step towards mastery",
            "Keep up the excellent work!"
        ];
    }
};

// Admin Placeholder functions
export const postCurriculum = asyncHandler(async (req, res) => {
    res.status(501).json({ message: "Admin postCurriculum not implemented with new schema" });
});

export const postQuiz = asyncHandler(async (req, res) => {
     // This function might be adaptable with the new Quiz model
    res.status(501).json({ message: "Admin postQuiz needs review for new schema" });
});