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
    PERFECT_SCORE: { description: 'Achieve 100% on a quiz', threshold: 1, unit: 'perfect score' },
    HIGH_PERFORMER: { description: 'Achieve an average score of 80% or higher', threshold: 80, unit: 'average score' },
    WEEKLY_WARRIOR: { description: 'Maintain a 7-day learning streak', threshold: 7, unit: 'days' },
};

// Get complete dashboard data
export const getUserDashboard = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    try {
        console.log('Fetching dashboard data for user:', userId);

        // Fetch all required data in parallel for better performance
        // REMOVED .sort() from QuizScore.find() to avoid indexing issues
        const [
            quizScoresCurrentUser,
            subjectProgress,
            user
        ] = await Promise.all([
            // Fetch quiz scores for the current user WITHOUT sorting
            QuizScore.find({ userId: userId }).lean(), // Added .lean() for better performance
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

        // Sort quiz scores in JavaScript instead of MongoDB
        const sortedQuizScores = quizScoresCurrentUser.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        // Calculate streak
        const calculateStreak = (quizScores) => {
            if (!quizScores || quizScores.length === 0) return { currentStreak: 0, longestStreak: 0 };

            // Use the already sorted scores
            const sortedScores = [...quizScores];
            
            let currentStreak = 0;
            let longestStreak = 0;
            let tempStreak = 0;
            let lastDate = null;

            // Process each quiz score
            for (const score of sortedScores) {
                const quizDate = new Date(score.createdAt);
                quizDate.setHours(0, 0, 0, 0); // Normalize to start of day

                if (!lastDate) {
                    // First quiz
                    tempStreak = 1;
                    lastDate = quizDate;
                } else {
                    const dayDiff = Math.floor((lastDate - quizDate) / (1000 * 60 * 60 * 24));
                    
                    if (dayDiff === 1) {
                        // Consecutive day
                        tempStreak++;
                    } else if (dayDiff === 0) {
                        // Same day, don't increment streak
                        continue;
                    } else {
                        // Streak broken
                        if (tempStreak > longestStreak) {
                            longestStreak = tempStreak;
                        }
                        tempStreak = 1;
                    }
                    lastDate = quizDate;
                }
            }

            // Update longest streak if current streak is longer
            if (tempStreak > longestStreak) {
                longestStreak = tempStreak;
            }

            // Check if the last activity was today or yesterday
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (lastDate && (lastDate.getTime() === today.getTime() || lastDate.getTime() === yesterday.getTime())) {
                currentStreak = tempStreak;
            } else {
                currentStreak = 0;
            }

            return { currentStreak, longestStreak };
        };

        const { currentStreak, longestStreak } = calculateStreak(sortedQuizScores);
        console.log('Calculated streaks:', { currentStreak, longestStreak });

        // Calculate total time spent from quiz scores
        const totalTimeSpent = quizScoresCurrentUser.reduce((sum, quiz) => sum + (quiz.timeSpent || 0), 0);
        
        // Calculate total points earned from quiz scores (10 points per correct answer)
        const totalPointsEarned = quizScoresCurrentUser.reduce((sum, quiz) => {
            const correctAnswers = quiz.correctAnswers || 0;
            return sum + (correctAnswers * 10);
        }, 0);
        
        // Calculate total experience from quiz scores (5 XP per correct answer)
        const totalExperience = quizScoresCurrentUser.reduce((sum, quiz) => {
            const correctAnswers = quiz.correctAnswers || 0;
            return sum + (correctAnswers * 5);
        }, 0);

        // Calculate level based on experience (1000 XP per level)
        const level = Math.floor(totalExperience / 1000) + 1;

        // Calculate star rating
        const starRating = {
            current: Math.floor(totalExperience / 1000) + 1,
            nextThreshold: (Math.floor(totalExperience / 1000) + 1) * 1000,
            xpToNextStar: ((Math.floor(totalExperience / 1000) + 1) * 1000) - totalExperience,
            totalExperience: totalExperience
        };

        // Calculate quiz statistics using quizScoresCurrentUser
        const totalQuizzes = quizScoresCurrentUser.length;
        const scores = quizScoresCurrentUser.map(q => {
            // Calculate score as percentage of correct answers
            const correctAnswers = q.correctAnswers || 0;
            const totalQuestions = q.totalQuestions || 1;
            return (correctAnswers / totalQuestions) * 100;
        });
        const highestScore = totalQuizzes > 0 ? Math.max(...scores) : 0;
        const averageScore = totalQuizzes > 0 
            ? Math.round(scores.reduce((sum, score) => sum + score, 0) / totalQuizzes * 100) / 100
            : 0;

        // Get completed videos
        const completedVideos = user?.completedVideos?.length || 0;

        // Prepare chart data
        const chartData = {
            scoreDistribution: {
                low: quizScoresCurrentUser.filter(q => {
                    const score = (q.correctAnswers / q.totalQuestions) * 100;
                    return score < 50;
                }).length,
                mid: quizScoresCurrentUser.filter(q => {
                    const score = (q.correctAnswers / q.totalQuestions) * 100;
                    return score >= 50 && score < 80;
                }).length,
                high: quizScoresCurrentUser.filter(q => {
                    const score = (q.correctAnswers / q.totalQuestions) * 100;
                    return score >= 80;
                }).length,
            },
            quizzesBySubject: quizScoresCurrentUser.reduce((acc, q) => {
                const subject = q.subjectName || 'Unknown';
                acc[subject] = (acc[subject] || 0) + 1;
                return acc;
            }, {}),
            performanceOverTime: sortedQuizScores
                .slice(0, 10) // Take the 10 most recent quizzes
                .map(q => {
                    // Calculate score as percentage of correct answers
                    const correctAnswers = q.correctAnswers || 0;
                    const totalQuestions = q.totalQuestions || 1;
                    const score = Math.round((correctAnswers / totalQuestions) * 100);
                    
                    return {
                        date: q.createdAt,
                        score: score,
                        subject: q.subjectName || 'Unknown',
                        topic: q.topicName || 'Unknown',
                        subtopic: q.subtopicName || 'Unknown'
                    };
                })
                .reverse(), // Reverse to show oldest to newest
            subjectPerformance: subjectProgress.map(sp => ({
                ...sp,
                averageScore: Math.round((sp.averageScore || 0) * 100) / 100 // Round to 2 decimal places
            }))
        };

        // Get recent quiz history - use the first 5 from sorted array
        const recentQuizHistory = sortedQuizScores.slice(0, 5).map(quiz => ({
            id: quiz._id,
            subject: quiz.subjectName,
            score: (quiz.correctAnswers / quiz.totalQuestions) * 100,
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
                    current = quizScoresCurrentUser.filter(qs => {
                        const score = (qs.correctAnswers / qs.totalQuestions) * 100;
                        return score === 100;
                    }).length;
                    progress = current >= achievement.threshold ? 100 : 0;
                    break;
                case 'HIGH_PERFORMER':
                    current = averageScore;
                    progress = Math.min(averageScore / achievement.threshold, 1) * 100;
                    break;
                case 'WEEKLY_WARRIOR':
                    current = currentStreak;
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
        const formattedFunFacts = [
            { id: 1, text: "Did you know? The average human attention span is shorter than a goldfish's! Keep practicing!", category: "General", icon: "💡" },
            { id: 2, text: "Solving quizzes boosts your brainpower by making new connections!", category: "Learning", icon: "🧠" },
            { id: 3, text: "Regular practice, even short sessions, is more effective than cramming.", category: "Study Tips", icon: "📚" },
            { id: 4, text: "Teaching others is a great way to solidify your own understanding.", category: "Study Tips", icon: "🤝" },
            { id: 5, text: "Challenge yourself with topics you find difficult – that's where the biggest growth happens!", category: "Motivation", icon: "💪" }
        ];

        // Format subject progress
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
                totalTimeSpent: totalTimeSpent,
                currentStreak: currentStreak,
                longestStreak: longestStreak,
                totalPointsEarned: totalPointsEarned,
                level: level,
                experience: totalExperience,
                starRating: starRating
            }
        };

        console.log('Successfully prepared dashboard data');
        console.log('User stats:', dashboardData.userStats);

        res.status(200).json({
            success: true,
            message: 'Dashboard data retrieved successfully',
            data: dashboardData,
        });

    } catch (error) {
        console.error('Dashboard data fetch error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch dashboard data', 
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
        });
    }
});

// Continue Learning - Fixed version without sorting in MongoDB
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

// Rest of your functions remain the same...
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

export const getUserAchievements = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;

        // Fetch all quiz scores for the user WITHOUT sorting
        const quizScores = await QuizScore.find({ userId: userId }).lean();

        // Fetch user details
        const user = await User.findById(userId);

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
                    current = quizScores.filter(qs => {
                        const score = (qs.correctAnswers / qs.totalQuestions) * 100;
                        return score === 100;
                    }).length;
                    progress = current >= achievement.threshold ? 100 : 0;
                    break;
                case 'HIGH_PERFORMER':
                    const scores = quizScores.map(qs => (qs.correctAnswers / qs.totalQuestions) * 100);
                    const averageScore = scores.length > 0 
                        ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
                        : 0;
                    current = averageScore;
                    progress = Math.min(averageScore / achievement.threshold, 1) * 100;
                    break;
                case 'WEEKLY_WARRIOR':
                    const currentStreak = 0; // Replace with actual streak calculation
                    current = currentStreak;
                    progress = Math.min(currentStreak / achievement.threshold, 1) * 100;
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

export const getUserProgress = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;

        // Fetch relevant data WITHOUT sorting
        const quizScores = await QuizScore.find({ userId: userId }).lean();
        const user = await User.findById(userId).select('completedVideos');

        // Calculate quiz statistics
        const totalQuizzes = quizScores.length;
        const scores = quizScores.map(qs => {
            const correctAnswers = qs.correctAnswers || 0;
            const totalQuestions = qs.totalQuestions || 1;
            return (correctAnswers / totalQuestions) * 100;
        });
        const averageScore = totalQuizzes > 0
            ? Math.round(scores.reduce((sum, score) => sum + score, 0) / totalQuizzes * 100) / 100
            : 0;
        const highestScore = totalQuizzes > 0 ? Math.max(...scores) : 0;

        // Get completed videos
        const completedVideos = user?.completedVideos?.length || 0;

        // Calculate streak (placeholder)
        const currentStreak = 0;

        res.status(200).json({
            success: true,
            data: {
                totalQuizzes,
                averageScore,
                highestScore,
                completedVideos,
                currentStreak,
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

// Helper functions
const calculateStreak = async (user) => {
    const lastActivity = user.lastActive || new Date();
    const today = new Date();
    const diffDays = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
    
    return diffDays <= 1 ? (user.currentStreak || 0) : 0;
};

const calculatePercentile = (user) => {
    return Math.floor(Math.random() * 30) + 70; // Returns 70-99
};

const generateFunFacts = async (user) => {
    try {
        const quizHistory = await QuizScore.find({ user: user._id }).lean();
        const totalMinutes = Math.round((user.totalTimeSpent || 0) / 60);
        const totalQuizzes = quizHistory.length;
        const averageScore = totalQuizzes > 0 
            ? Math.round(quizHistory.reduce((sum, q) => sum + (q.score || 0), 0) / totalQuizzes)
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