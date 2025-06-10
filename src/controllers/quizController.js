import asyncHandler from 'express-async-handler';
import Quiz from '../models/Quiz.js';
import QuizScore from '../models/QuizScore.js';
import User from '../models/User.js';
import Video from '../models/Video.js';
import Subject from '../models/Subject.js';
import Topic from '../models/Topic.js';
import mongoose from 'mongoose';
import Subtopic from '../models/Subtopic.js';

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
        // Find the quiz
        const quiz = await Quiz.findOne({ videoUrl: videoUrl.trim() });
        console.log('Quiz found:', quiz);

        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: 'Quiz not found'
            });
        }

        // Find the video using the videoId from the quiz
        const video = await Video.findById(quiz.videoId);
        console.log('Video found by ID:', video);

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
        const selectedQuestions = shuffledQuestions.slice(0, 10);

        // Prepare the response with or without subject information
        const response = {
            _id: quiz._id,
            videoUrl: quiz.videoUrl,
            videoId: quiz.videoId,
            questions: selectedQuestions,
            totalQuestions: quiz.questions.length,
            selectedQuestionsCount: selectedQuestions.length
        };

        // If video is found, get subject information
        if (video) {
            response.subject = {
                name: video.subName,
                chapterName: video.chapterName,
                topicName: video.topicName,
                subtopicName: video.subtopicName
            };
        } else {
            // If video not found by ID, try to find it by URL
            const videoByUrl = await Video.findOne({ videoUrl: videoUrl.trim() });
            console.log('Video found by URL:', videoByUrl);

            if (videoByUrl) {
                response.subject = {
                    name: videoByUrl.subName,
                    chapterName: videoByUrl.chapterName,
                    topicName: videoByUrl.topicName,
                    subtopicName: videoByUrl.subtopicName
                };
            }
        }

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
