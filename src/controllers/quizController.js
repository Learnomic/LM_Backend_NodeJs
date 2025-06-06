import asyncHandler from 'express-async-handler';
import Quiz from '../models/Quiz.js';
import QuizScore from '../models/QuizScore.js';
import User from '../models/User.js';
import Video from '../models/Video.js';
import Subject from '../models/Subject.js';
import Topic from '../models/Topic.js';
import mongoose from 'mongoose';
import Subtopic from '../models/Subtopic.js';
import Chapter from '../models/Chapter.js';

// Cache for quiz data
const quizCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

// Cache cleanup interval (every 10 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of quizCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            quizCache.delete(key);
        }
    }
}, 10 * 60 * 1000);

// Get all quizzes with pagination and lazy loading
export const getAllQuizzes = asyncHandler(async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Create cache key
        const cacheKey = `quizzes:${page}:${limit}`;

        // Check cache first
        const cachedResponse = quizCache.get(cacheKey);
        if (cachedResponse && (Date.now() - cachedResponse.timestamp < CACHE_TTL)) {
            return res.json(cachedResponse.data);
        }

        // Get total count for pagination
        const totalQuizzes = await Quiz.countDocuments();

        // Fetch quizzes with pagination and lean query
        const quizzes = await Quiz.find()
            .select('videoId videoUrl questions')
            .skip(skip)
            .limit(limit)
            .lean();

        if (!quizzes || quizzes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No quizzes found'
            });
        }

        const response = {
            success: true,
            count: quizzes.length,
            totalQuizzes,
            totalPages: Math.ceil(totalQuizzes / limit),
            currentPage: page,
            data: quizzes
        };

        // Store in cache
        quizCache.set(cacheKey, { data: response, timestamp: Date.now() });

        res.json(response);
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching quizzes',
            error: error.message
        });
    }
});

// Get quiz by video URL with caching
export const getQuizByVideoUrl = asyncHandler(async (req, res) => {
    const { videoUrl } = req.query;
    
    if (!videoUrl) {
        return res.status(400).json({
            success: false,
            message: 'Video URL is required'
        });
    }

    try {
        // Check cache first
        const cacheKey = `quiz:${videoUrl}`;
        const cachedResponse = quizCache.get(cacheKey);
        if (cachedResponse && (Date.now() - cachedResponse.timestamp < CACHE_TTL)) {
            return res.json(cachedResponse.data);
        }

        // Find the quiz with lean query and only select necessary fields
        const quiz = await Quiz.findOne({ videoUrl: videoUrl.trim() })
            .select('_id videoUrl videoId questions')
            .lean();

        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: 'Quiz not found'
            });
        }

        // Find the video using the videoId from the quiz
        const video = await Video.findOne({ 
            $or: [
                { _id: quiz.videoId },
                { videoUrl: videoUrl.trim() }
            ]
        })
        .select('subName chapterName topicName subtopicName')
        .lean();

        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
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
        
        // Take only first 10 questions and ensure they have the correct structure
        const selectedQuestions = shuffledQuestions.slice(0, 10).map(q => ({
            opt: {
                a: q.opt?.a || '',
                b: q.opt?.b || '',
                c: q.opt?.c || '',
                d: q.opt?.d || ''
            },
            _id: q._id,
            que: q.que,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || ''
        }));

        // Prepare the response
        const response = {
            success: true,
            data: {
                _id: quiz._id,
                videoUrl: quiz.videoUrl,
                videoId: quiz.videoId,
                questions: selectedQuestions,
                totalQuestions: quiz.questions.length,
                selectedQuestionsCount: 10,
                subject: {
                    name: video.subName,
                    chapterName: video.chapterName,
                    topicName: video.topicName,
                    subtopicName: video.subtopicName
                }
            }
        };

        // Store in cache
        quizCache.set(cacheKey, { data: response, timestamp: Date.now() });

        res.json(response);
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
    try {
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

        // Validate required fields
        if (!quizId || !videoId || !subjectId || !subjectName || !topicId || !topicName || !totalQuestions || !correctAnswers || !score || !timeSpent || !answers) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                required: {
                    quizId: 'Quiz ID',
                    videoId: 'Video ID',
                    subjectId: 'Subject ID',
                    subjectName: 'Subject Name',
                    topicId: 'Topic ID',
                    topicName: 'Topic Name',
                    totalQuestions: 'Total Questions',
                    correctAnswers: 'Correct Answers',
                    score: 'Score',
                    timeSpent: 'Time Spent',
                    answers: 'Answers Array'
                }
            });
        }

        // Convert string IDs to ObjectId
        const videoObjectId = new mongoose.Types.ObjectId(videoId);
        const quizObjectId = new mongoose.Types.ObjectId(quizId);
        const subjectObjectId = new mongoose.Types.ObjectId(subjectId);
        const topicObjectId = new mongoose.Types.ObjectId(topicId);

        // Find the video to verify it exists
        const video = await Video.findById(videoObjectId);
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
            quizId: quizObjectId,
            videoId: videoObjectId,
            subjectId: subjectObjectId,
            subjectName,
            topicId: topicObjectId,
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

        // Update user stats
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $inc: { 
                    totalTimeSpent: timeSpent,
                    totalPoints: pointsEarned,
                    experience: experienceEarned
                },
                $addToSet: { completedVideos: videoObjectId }
            },
            { new: true }
        );
        console.log('Updated user:', updatedUser);

        res.status(201).json({
            success: true,
            message: 'Quiz submitted successfully',
            data: {
                quizScore: savedQuizScore,
                stats: {
                    pointsEarned,
                    experienceEarned
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
