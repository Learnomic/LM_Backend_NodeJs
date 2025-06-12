import asyncHandler from 'express-async-handler';
import Quiz from '../models/Quiz.js';
import QuizScore from '../models/QuizScore.js';
import User from '../models/User.js';
import Video from '../models/Video.js';
import Subject from '../models/Subject.js';
import Topic from '../models/Topic.js';
import mongoose from 'mongoose';
import Subtopic from '../models/Subtopic.js';
import TestScore from '../models/TestScore.js';

// Get quiz by video URL
export const getQuizByVideoUrl = asyncHandler(async (req, res) => {
    const { videoUrl } = req.query;
    console.log('Received videoUrl:', videoUrl);

    if (!videoUrl) {
        return res.status(400).json({
            success: false,
            message: 'Video URL is required'
        });
    }

    try {
        // First check if video exists
        const video = await Video.findOne({ videoUrl: videoUrl.trim() });
        console.log('Video found:', video);

        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found in database'
            });
        }

        // Find the quiz for this video
        const quiz = await Quiz.findOne({ videoUrl: videoUrl.trim() });
        console.log('Quiz found:', quiz);

        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: 'No quiz found for this video'
            });
        }

        // Shuffle questions array using Fisher-Yates algorithm
        const shuffleArray = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };

        // Create a copy of questions array and shuffle it
        const shuffledQuestions = shuffleArray([...quiz.questions]);
        
        // Take only first 10 questions
        const selectedQuestions = shuffledQuestions.slice(0, 10).map(q => ({
            question: q.que,
            options: q.opt,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation
        }));

        // Prepare the response
        const response = {
            _id: quiz._id,
            videoUrl: quiz.videoUrl,
            videoId: quiz.videoId,
            questions: selectedQuestions,
            totalQuestions: quiz.questions.length,
            selectedQuestionsCount: selectedQuestions.length,
            subject: {
                name: video.subName,
                chapterName: video.chapterName,
                topicName: video.topicName,
                subtopicName: video.subtopicName
            }
        };

        res.status(200).json({
            success: true,
            data: response
        });
    } catch (error) {
        console.error('Error fetching quiz:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching quiz',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Submit quiz
export const submitQuiz = asyncHandler(async (req, res) => {
    const {
        quizId,
        videoId,
        subjectId,
        subjectName,
        topicId,
        topicName,
        chapterName,
        subtopicName,
        totalQuestions,
        correctAnswers,
        score,
        timeSpent,
        answers
    } = req.body;

    // Get userId from authenticated user
    const userId = req.user._id;

    console.log('Received quiz submission:', {
        userId,
        quizId,
        videoId,
        subjectId,
        subjectName,
        topicId,
        topicName,
        totalQuestions,
        correctAnswers,
        score,
        timeSpent
    });

    try {
        // Find the video to verify it exists
        const video = await Video.findById(videoId);
        console.log('Found video:', video);
        
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        // Calculate points and experience
        const pointsEarned = Math.round(score * 10); // 10 points per percentage point
        const experienceEarned = Math.round(score * 5); // 5 XP per percentage point

        console.log('Calculated rewards:', {
            pointsEarned,
            experienceEarned
        });

        // Create new quiz score
        const quizScore = new QuizScore({
            userId,
            quizId,
            videoId,
            subjectId,
            subjectName,
            topicId,
            topicName,
            chapterName,
            subtopicName,
            totalQuestions,
            correctAnswers,
            score,
            timeSpent,
            answers
        });

        console.log('Created quiz score object:', quizScore);

        // Save the quiz score
        const savedQuizScore = await quizScore.save();
        console.log('Saved quiz score:', savedQuizScore);

        // Get current user data
        const user = await User.findById(userId);
        console.log('Found user:', user);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Calculate new streak
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastActivity = new Date(user.updatedAt);
        lastActivity.setHours(0, 0, 0, 0);
        const daysSinceLastActivity = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
        
        let newCurrentStreak = user.currentStreak;
        let newLongestStreak = user.longestStreak;

        if (daysSinceLastActivity === 0) {
            // Activity today, maintain current streak
            // Don't increment streak for multiple quizzes in same day
        } else if (daysSinceLastActivity === 1) {
            // Activity yesterday, increment streak
            newCurrentStreak += 1;
            if (newCurrentStreak > newLongestStreak) {
                newLongestStreak = newCurrentStreak;
            }
        } else {
            // Activity after more than 1 day, reset streak
            newCurrentStreak = 1;
        }

        console.log('Calculated streaks:', {
            daysSinceLastActivity,
            newCurrentStreak,
            newLongestStreak
        });

        // Update user stats
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $inc: { 
                    totalTimeSpent: timeSpent,
                    totalPoints: pointsEarned,
                    experience: experienceEarned
                },
                $set: {
                    currentStreak: newCurrentStreak,
                    longestStreak: newLongestStreak
                },
                $addToSet: { completedVideos: videoId }
            },
            { new: true } // Return the updated document
        );
        console.log('Updated user:', updatedUser);

        res.status(201).json({
            success: true,
            message: 'Quiz submitted successfully',
            data: {
                quizScore: savedQuizScore,
                stats: {
                    pointsEarned,
                    experienceEarned,
                    newCurrentStreak,
                    newLongestStreak
                }
            }
        });
    } catch (error) {
        console.error('Detailed error in submitQuiz:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        res.status(500).json({
            success: false,
            message: 'Error submitting quiz',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get leaderboard for a specific video
// @route   GET /api/leaderboard/:videoId
// @access  Private
export const getLeaderboard = async (req, res) => {
  try {
    const { videoId } = req.params;

    // Find the quiz associated with the videoId
    const quiz = await Quiz.findOne({ videoId: videoId });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found for this video.' });
    }

    const quizId = quiz._id;

    const leaderboard = await QuizScore.find({ quizId: quizId })
      .sort({ score: -1, timeTaken: 1 }) // higher score, faster timeTaken
      .limit(10)
      .populate('userId', 'name') // Populate user name for leaderboard display
      .select('userId score timeTaken createdAt'); // Select fields to return

    res.json({ leaderboard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching leaderboard' });
  }
};


export const getUserQuizHistory = async (req, res) => {
  console.log("Fetching user quiz history");
  
  try {
    const userId = req.user._id;

    const history = await QuizScore.find({ userId })
      .sort({ createdAt: -1 })
      .populate('quizId')
      .populate('subjectId')
      .populate('chapterId')
      .populate('topicId')
      .populate('subtopicId');

    res.json({ history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching user history' });
  }
};

// Generate random question paper for a subject
export const generateRandomQuestionPaper = asyncHandler(async (req, res) => {
    const { subjectName } = req.params;
    const QUESTIONS_REQUIRED = 25;

    try {
        // Find all quizzes for the given subject
        const quizzes = await Quiz.find({
            'questions.subjectName': subjectName
        }).select('questions');

        if (!quizzes || quizzes.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No quizzes found for subject: ${subjectName}`
            });
        }

        // Collect all questions from all quizzes
        let allQuestions = [];
        quizzes.forEach(quiz => {
            const subjectQuestions = quiz.questions.filter(q => q.subjectName === subjectName);
            allQuestions = [...allQuestions, ...subjectQuestions];
        });

        if (allQuestions.length < QUESTIONS_REQUIRED) {
            return res.status(400).json({
                success: false,
                message: `Not enough questions available. Found ${allQuestions.length} questions, but ${QUESTIONS_REQUIRED} are required.`
            });
        }

        // Shuffle questions using Fisher-Yates algorithm
        const shuffleArray = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };

        // Shuffle and select required number of questions
        const shuffledQuestions = shuffleArray([...allQuestions]);
        const selectedQuestions = shuffledQuestions.slice(0, QUESTIONS_REQUIRED);

        // Format response
        const response = {
            subject: subjectName,
            totalQuestions: selectedQuestions.length,
            questions: selectedQuestions.map(q => ({
                question: q.question,
                options: q.options,
                correctAnswer: q.correctAnswer
            }))
        };

        res.status(200).json({
            success: true,
            data: response
        });

    } catch (error) {
        console.error('Error generating question paper:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating question paper',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Generate question paper by merging quizzes from a subject
export const generateSubjectQuestionPaper = asyncHandler(async (req, res) => {
    const { subjectName } = req.params;
    const QUESTIONS_REQUIRED = 25;

    try {
        // Find all videos for the given subject
        const videos = await Video.find({ subName: subjectName });
        console.log(`Found ${videos.length} videos for subject: ${subjectName}`);

        if (!videos || videos.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No videos found for subject: ${subjectName}`
            });
        }

        // Get all video URLs
        const videoUrls = videos.map(video => video.videoUrl);

        // Find all quizzes for these videos
        const quizzes = await Quiz.find({ videoUrl: { $in: videoUrls } });
        console.log(`Found ${quizzes.length} quizzes for subject: ${subjectName}`);

        if (!quizzes || quizzes.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No quizzes found for subject: ${subjectName}`
            });
        }

        // Collect all questions from all quizzes
        let allQuestions = [];
        quizzes.forEach(quiz => {
            allQuestions = [...allQuestions, ...quiz.questions];
        });

        console.log(`Total questions found: ${allQuestions.length}`);

        if (allQuestions.length < QUESTIONS_REQUIRED) {
            return res.status(400).json({
                success: false,
                message: `Not enough questions available. Found ${allQuestions.length} questions, but ${QUESTIONS_REQUIRED} are required.`
            });
        }

        // Shuffle questions using Fisher-Yates algorithm
        const shuffleArray = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };

        // Shuffle and select required number of questions
        const shuffledQuestions = shuffleArray([...allQuestions]);
        const selectedQuestions = shuffledQuestions.slice(0, QUESTIONS_REQUIRED);

        // Format response
        const response = {
            subject: subjectName,
            totalQuestions: selectedQuestions.length,
            questions: selectedQuestions.map(q => ({
                question: q.que,
                options: q.opt,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation
            }))
        };

        res.status(200).json({
            success: true,
            data: response
        });

    } catch (error) {
        console.error('Error generating question paper:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating question paper',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Submit test score
export const submitTestScore = asyncHandler(async (req, res) => {
    try {
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        
        const {
            quizId,
            subjectId,
            subjectName,
            totalQuestions,
            correctAnswers,
            score,
            timeSpent,
            answers
        } = req.body;

        // Get userId from authenticated user
        const userId = req.user._id;

        console.log('Received test score submission:', {
            userId,
            quizId,
            subjectId,
            subjectName,
            totalQuestions,
            correctAnswers,
            score,
            timeSpent,
            answersCount: answers?.length
        });

        // Validate required fields
        if (!quizId || !subjectId || !subjectName || !totalQuestions || !correctAnswers || !score || !timeSpent || !answers) {
            console.error('Missing required fields:', {
                quizId: !!quizId,
                subjectId: !!subjectId,
                subjectName: !!subjectName,
                totalQuestions: !!totalQuestions,
                correctAnswers: !!correctAnswers,
                score: !!score,
                timeSpent: !!timeSpent,
                answers: !!answers
            });
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                error: 'Please provide all required fields'
            });
        }

        // Create new test score
        const testScore = new TestScore({
            userId,
            quizId,
            subjectId,
            subjectName,
            totalQuestions,
            correctAnswers,
            score,
            timeSpent,
            answers
        });

        console.log('Created test score object:', testScore);

        // Save the test score
        const savedTestScore = await testScore.save();
        console.log('Saved test score:', savedTestScore);

        // Get current user data
        const user = await User.findById(userId);
        console.log('Found user:', user ? 'Yes' : 'No');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Calculate points and experience
        const pointsEarned = Math.round(score * 10); // 10 points per percentage point
        const experienceEarned = Math.round(score * 5); // 5 XP per percentage point

        // Calculate new streak
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastActivity = new Date(user.updatedAt);
        lastActivity.setHours(0, 0, 0, 0);
        const daysSinceLastActivity = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
        
        let newCurrentStreak = user.currentStreak;
        let newLongestStreak = user.longestStreak;

        if (daysSinceLastActivity === 0) {
            // Activity today, maintain current streak
            // Don't increment streak for multiple quizzes in same day
        } else if (daysSinceLastActivity === 1) {
            // Activity yesterday, increment streak
            newCurrentStreak += 1;
            if (newCurrentStreak > newLongestStreak) {
                newLongestStreak = newCurrentStreak;
            }
        } else {
            // Activity after more than 1 day, reset streak
            newCurrentStreak = 1;
        }

        // Update user stats
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $inc: { 
                    totalTimeSpent: timeSpent,
                    totalPoints: pointsEarned,
                    experience: experienceEarned
                },
                $set: {
                    currentStreak: newCurrentStreak,
                    longestStreak: newLongestStreak
                }
            },
            { new: true }
        );

        res.status(201).json({
            success: true,
            message: 'Test score submitted successfully',
            data: {
                testScore: savedTestScore,
                stats: {
                    pointsEarned,
                    experienceEarned,
                    newCurrentStreak,
                    newLongestStreak
                }
            }
        });
    } catch (error) {
        console.error('Detailed error in submitTestScore:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code
        });
        
        // Handle specific MongoDB errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                error: Object.values(error.errors).map(err => err.message)
            });
        }
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid ID format',
                error: `Invalid ${error.path}: ${error.value}`
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error submitting test score',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get test history for a user
export const getTestHistory = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const subjectId = req.query.subjectId;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        // Build query
        const query = { userId };
        
        if (subjectId) {
            query.subjectId = subjectId;
        }

        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Get total count for pagination
        const total = await TestScore.countDocuments(query);

        // Get test scores with pagination
        const testScores = await TestScore.find(query)
            .sort({ createdAt: -1 }) // Sort by newest first
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('subjectId', 'name')
            .populate('quizId', 'title');

        // Calculate statistics
        const stats = await TestScore.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    averageScore: { $avg: '$score' },
                    highestScore: { $max: '$score' },
                    totalTests: { $sum: 1 },
                    totalCorrectAnswers: { $sum: '$correctAnswers' },
                    totalQuestions: { $sum: '$totalQuestions' },
                    totalTimeSpent: { $sum: '$timeSpent' }
                }
            }
        ]);

        // Get subject-wise statistics
        const subjectStats = await TestScore.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$subjectId',
                    subjectName: { $first: '$subjectName' },
                    averageScore: { $avg: '$score' },
                    highestScore: { $max: '$score' },
                    totalTests: { $sum: 1 },
                    totalCorrectAnswers: { $sum: '$correctAnswers' },
                    totalQuestions: { $sum: '$totalQuestions' }
                }
            },
            { $sort: { totalTests: -1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                testScores,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                },
                overallStats: stats[0] || {
                    averageScore: 0,
                    highestScore: 0,
                    totalTests: 0,
                    totalCorrectAnswers: 0,
                    totalQuestions: 0,
                    totalTimeSpent: 0
                },
                subjectStats
            }
        });
    } catch (error) {
        console.error('Error in getTestHistory:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching test history',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});
