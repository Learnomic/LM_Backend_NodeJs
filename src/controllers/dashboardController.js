import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import Achievement from '../models/achievementModel.js';
import Badge from '../models/badgeModel.js';
import FunFact from '../models/funFactModel.js';
import QuizHistory from '../models/quizHistoryModel.js';
import Leaderboard from '../models/leaderboardModel.js';
import SubjectProgress from '../models/subjectProgressModel.js';
import { BADGES, ACHIEVEMENTS } from '../constants/rewards.js';

// Get complete dashboard data
export const getUserDashboard = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    try {
        // Fetch all required data in parallel for better performance
        const [
            quizHistory,
            achievements,
            badges,
            funFacts,
            leaderboard,
            subjectProgress,
            user
        ] = await Promise.all([
            QuizHistory.find({ user: userId }).sort({ createdAt: -1 }),
            Achievement.find({ user: userId }),
            Badge.find({ user: userId }),
            FunFact.find().limit(5), // Limit to 5 random fun facts
            Leaderboard.find().sort({ score: -1 }).limit(10).populate('user', 'name email'),
            SubjectProgress.find({ user: userId }),
            User.findById(userId)
        ]);

        // Calculate quiz statistics
        const totalQuizzes = quizHistory.length;
        const scores = quizHistory.map(q => q.score || 0);
        const highestScore = totalQuizzes > 0 ? Math.max(...scores) : 0;
        const averageScore = totalQuizzes > 0 
            ? Math.round(scores.reduce((sum, score) => sum + score, 0) / totalQuizzes * 100) / 100
            : 0;

        // Get completed videos (you can modify this based on your video tracking logic)
        const completedVideos = user?.completedVideos?.length || 0;

        // Prepare chart data with better structure
        const chartData = {
            scoreDistribution: {
                low: quizHistory.filter(q => q.score < 50).length,
                mid: quizHistory.filter(q => q.score >= 50 && q.score < 80).length,
                high: quizHistory.filter(q => q.score >= 80).length,
            },
            quizzesBySubject: quizHistory.reduce((acc, q) => {
                const subject = q.subject || 'Unknown';
                acc[subject] = (acc[subject] || 0) + 1;
                return acc;
            }, {}),
            performanceOverTime: quizHistory.slice(-10).map(q => ({
                date: q.createdAt,
                score: q.score,
                subject: q.subject
            })),
            subjectPerformance: subjectProgress.map(sp => ({
                subject: sp.subject,
                progress: sp.progress,
                totalTopics: sp.totalTopics,
                completedTopics: sp.completedTopics
            }))
        };

        // Get recent quiz history (last 5 quizzes)
        const recentQuizHistory = quizHistory.slice(0, 5).map(quiz => ({
            id: quiz._id,
            subject: quiz.subject,
            score: quiz.score,
            totalQuestions: quiz.totalQuestions,
            correctAnswers: quiz.correctAnswers,
            timeTaken: quiz.timeTaken,
            date: quiz.createdAt,
            difficulty: quiz.difficulty
        }));

        // Format achievements data
        const formattedAchievements = achievements.map(ach => ({
            id: ach._id,
            name: ach.name,
            description: ach.description,
            type: ach.type,
            progress: ach.progress,
            maxProgress: ach.maxProgress,
            completed: ach.completed,
            dateEarned: ach.dateEarned,
            icon: ach.icon
        }));

        // Format badges data
        const formattedBadges = badges.map(badge => ({
            id: badge._id,
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
            rarity: badge.rarity,
            dateEarned: badge.dateEarned
        }));

        // Format fun facts
        const formattedFunFacts = funFacts.map(fact => ({
            id: fact._id,
            text: fact.text,
            category: fact.category,
            icon: fact.icon
        }));

        // Format leaderboard
        const formattedLeaderboard = leaderboard.map((entry, index) => ({
            rank: index + 1,
            userId: entry.user?._id,
            name: entry.user?.name || 'Anonymous',
            score: entry.score,
            totalQuizzes: entry.totalQuizzes,
            averageScore: entry.averageScore,
            badges: entry.badges || []
        }));

        // Format subject progress
        const formattedSubjectProgress = subjectProgress.map(sp => ({
            subject: sp.subject,
            progress: sp.progress,
            totalTopics: sp.totalTopics,
            completedTopics: sp.completedTopics,
            lastStudied: sp.lastStudied,
            timeSpent: sp.timeSpent,
            averageScore: sp.averageScore
        }));

        // Combine all data into a single response with guaranteed fields
        const dashboardData = {
            averageScore,
            highestScore,
            completedVideos,
            totalQuizzes,
            achievements: formattedAchievements,
            badges: formattedBadges,
            funFacts: formattedFunFacts,
            chartData,
            leaderboard: formattedLeaderboard,
            subjectProgress: formattedSubjectProgress,
            recentQuizHistory,
            // Additional useful metrics
            userStats: {
                totalTimeSpent: user?.totalTimeSpent || 0,
                currentStreak: user?.currentStreak || 0,
                longestStreak: user?.longestStreak || 0,
                totalPointsEarned: user?.totalPoints || 0,
                level: user?.level || 1,
                experience: user?.experience || 0
            }
        };

        res.status(200).json({
            success: true,
            message: 'Dashboard data retrieved successfully',
            data: dashboardData,
        });

    } catch (error) {
        console.error('Dashboard data fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
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

// Get user's badges
export const getUserBadges = asyncHandler(async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const userBadges = user.badges || [];
        
        const badges = {
            earned: userBadges.map(badgeId => BADGES[badgeId.toUpperCase()]).filter(Boolean),
            available: Object.values(BADGES).filter(badge => 
                !userBadges.includes(badge.id.toLowerCase())
            ),
            totalEarned: userBadges.length,
            totalAvailable: Object.keys(BADGES).length
        };
        
        res.status(200).json({
            success: true,
            data: badges
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user badges',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get user's achievements
export const getUserAchievements = asyncHandler(async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const userAchievements = user.achievements || [];
        
        const achievements = {
            completed: userAchievements
                .filter(ach => ach.progress >= ACHIEVEMENTS[ach.id.toUpperCase()]?.maxProgress)
                .map(ach => ({
                    ...ACHIEVEMENTS[ach.id.toUpperCase()],
                    completed: true,
                    dateCompleted: ach.dateCompleted
                })),
            inProgress: Object.values(ACHIEVEMENTS)
                .filter(ach => {
                    const userAch = userAchievements.find(ua => ua.id === ach.id);
                    return !userAch || userAch.progress < ach.maxProgress;
                })
                .map(ach => {
                    const userAch = userAchievements.find(ua => ua.id === ach.id);
                    return {
                        ...ach,
                        progress: userAch ? userAch.progress : 0,
                        percentage: userAch ? Math.round((userAch.progress / ach.maxProgress) * 100) : 0
                    };
                }),
            totalCompleted: userAchievements.filter(ach => 
                ach.progress >= ACHIEVEMENTS[ach.id.toUpperCase()]?.maxProgress
            ).length,
            totalAvailable: Object.keys(ACHIEVEMENTS).length
        };
        
        res.status(200).json({
            success: true,
            data: achievements
        });
    } catch (error) {
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

// API to fetch the next topic or video for the user to continue learning
export const getContinueLearning = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Fetch subject progress
    const subjectProgress = await SubjectProgress.find({ user: userId }).sort({ progress: 1 });

    if (!subjectProgress.length) {
        return res.json({
            success: true,
            message: 'No progress found. Start with a new subject!',
            nextTopic: null,
        });
    }

    // Find the subject with the least progress
    const nextSubject = subjectProgress[0];

    // Suggest the next topic or video (replace with actual logic if videos are tracked)
    const nextTopic = `Continue learning ${nextSubject.subject}. Current progress: ${nextSubject.progress}%`;

    res.json({
        success: true,
        message: 'Here is your next topic to continue learning!',
        nextTopic,
    });
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
        const quizHistory = await QuizHistory.find({ user: user._id });
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

// Helper function to check and award badges
export const checkAndAwardBadges = async (user) => {
    try {
        const newBadges = [];
        
        // Quick Learner check
        const todayQuizzes = user.quizzesTaken?.filter(quiz => 
            quiz.date.toDateString() === new Date().toDateString()
        ).length || 0;
        if (todayQuizzes >= 5 && !user.badges?.includes(BADGES.QUICK_LEARNER?.id)) {
            newBadges.push(BADGES.QUICK_LEARNER.id);
        }
        
        // Streak Master check
        if (user.currentStreak >= 7 && !user.badges?.includes(BADGES.STREAK_MASTER?.id)) {
            newBadges.push(BADGES.STREAK_MASTER.id);
        }
        
        // Perfect Score check
        const hasPerfectScore = user.quizzesTaken?.some(quiz => quiz.score === 100);
        if (hasPerfectScore && !user.badges?.includes(BADGES.PERFECT_SCORE?.id)) {
            newBadges.push(BADGES.PERFECT_SCORE.id);
        }
        
        // Knowledge Explorer check
        const uniqueTopics = new Set(user.quizzesTaken?.map(quiz => quiz.topic) || []).size;
        if (uniqueTopics >= 5 && !user.badges?.includes(BADGES.KNOWLEDGE_EXPLORER?.id)) {
            newBadges.push(BADGES.KNOWLEDGE_EXPLORER.id);
        }
        
        // Speed Demon check
        const hasSpeedQuiz = user.quizzesTaken?.some(quiz => 
            quiz.duration <= 120 && quiz.score >= 80
        );
        if (hasSpeedQuiz && !user.badges?.includes(BADGES.SPEED_DEMON?.id)) {
            newBadges.push(BADGES.SPEED_DEMON.id);
        }
        
        // Award new badges
        if (newBadges.length > 0) {
            await User.findByIdAndUpdate(user._id, {
                $addToSet: { badges: { $each: newBadges } }
            });
        }
        
        return newBadges;
    } catch (error) {
        console.error('Error checking and awarding badges:', error);
        return [];
    }
};