import asyncHandler from 'express-async-handler';
import Quiz from '../models/Quiz.js';
import QuizScore from '../models/QuizScore.js';
import User from '../models/User.js';
import Video from '../models/Video.js';
import Subject from '../models/Subject.js';
import Topic from '../models/Topic.js';
import mongoose from 'mongoose';

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
        const quiz = await Quiz.findOne({ videoUrl: videoUrl.trim() });
        console.log('Quiz found:', quiz);

        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: 'Quiz not found'
            });
        }

        res.status(200).json({
            success: true,
            data: quiz
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
        userId,
        videoId,
        score,
        totalQuestions,
        correctAnswers,
        timeSpent,
        answers
    } = req.body;

    try {
        // Find the video to get curriculum information
        const video = await Video.findById(videoId);
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        // Find the subject and topic based on the video's curriculum path
        const subject = await Subject.findOne({ subject: video.subName });
        if (!subject) {
            return res.status(404).json({
                success: false,
                message: 'Subject not found'
            });
        }

        const topic = await Topic.findOne({ topicName: video.topicName });
        if (!topic) {
            return res.status(404).json({
                success: false,
                message: 'Topic not found'
            });
        }

        // Create new quiz score
        const quizScore = new QuizScore({
            userId,
            videoId,
            subjectId: subject._id,
            subjectName: subject.subject,
            topicId: topic._id,
            topicName: topic.topicName,
            score,
            totalQuestions,
            correctAnswers,
            timeSpent,
            answers
        });

        // Save the quiz score
        await quizScore.save();

        // Update user's total time spent
        await User.findByIdAndUpdate(userId, {
            $inc: { totalTimeSpent: timeSpent }
        });

        res.status(201).json({
            success: true,
            message: 'Quiz submitted successfully',
            data: quizScore
        });
    } catch (error) {
        console.error('Error submitting quiz:', error);
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
