import asyncHandler from 'express-async-handler';
import QuizScore from '../models/QuizScore.js';
import VideosQuiz from '../models/VideosQuiz.js';
import User from '../models/User.js';
import Subject from '../models/Subject.js';
// import Quiz from '../models/Quiz.js';
// import Video from '../models/Video.js';
// import Topic from '../models/Topic.js';
// import Subtopic from '../models/Subtopic.js';
import mongoose from 'mongoose';

// Get quiz by video URL
export const getQuizByVideoUrl = asyncHandler(async (req, res) => {
    const { videoUrl } = req.query;

    if (!videoUrl) {
        return res.status(400).json({
            success: false,
            message: 'Video URL is required'
        });
    }

    try {
        console.log("Searching quiz for:", videoUrl);

        // Extract YouTube ID if it's a youtu.be or youtube.com link
        let ytId = null;
        if (videoUrl.includes("youtu.be/")) {
            ytId = videoUrl.split("youtu.be/")[1].split("?")[0];
        } else if (videoUrl.includes("watch?v=")) {
            ytId = videoUrl.split("watch?v=")[1].split("&")[0];
        }

        // Build query: match by url, videoUrl, or ytId
        const query = {
            $or: [
                { url: videoUrl.trim() },
                { videoUrl: videoUrl.trim() },
                ytId ? { ytId } : null
            ].filter(Boolean) // remove nulls
        };

        const video = await VideosQuiz.findOne(query).lean();

        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Quiz not found for this video'
            });
        }

        // Support both old (questions[]) and new (quiz[]) field names
        const quizData = video.quiz && video.quiz.length > 0 ? video.quiz : video.questions;

        if (!quizData || quizData.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No quiz questions found for this video'
            });
        }

        // Shuffle questions (optional)
        const shuffleArray = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };

        const shuffled = shuffleArray([...quizData]);
        const selected = shuffled.slice(0, 10); // pick up to 10

const response = {
    videoId: video._id,
    videoUrl: video.url || video.videoUrl,
    ytId: video.ytId,
    subject: {
        _id: video.subjectid,
        name: video.subName || '',   // <-- use subName here
        chapterName: video.chapterName || '',
        topicName: video.topicName || '',
        subtopicName: video.subtopicName || '',
        topicId: '' // leave blank since you don’t have topicId
    },
    board: video.board,
    grade: video.grade,
    questions: selected.map(q => ({
        que: q.question || q.que,
        opt: q.options || q.opt,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
    })),
    totalQuestions: quizData.length,
    selectedQuestionsCount: selected.length
};


        res.status(200).json({ success: true, data: response });
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
        videoId,         
        subjectName,
        topicName,
        chapterName,
        subtopicName,
        timeSpent,
        totalQuestions,
        correctAnswers,
        score,
        answers
    } = req.body;

    const userId = req.user._id;

    try {
        // ✅ Ensure quiz exists
const videoQuiz = await VideosQuiz.findById(videoId);
        if (!videoQuiz) {
            return res.status(404).json({
                success: false,
                message: 'Video quiz not found'
            });
        }

        // ✅ Save quiz score directly from frontend
        const quizScore = new QuizScore({
            userId,
            videoId: videoQuiz._id,           // ✅ match schema field
            subjectId: videoQuiz.subjectId,   // keep reference
            chapterId: videoQuiz.chapterId || null,
            subjectName,
            chapterName,
            topicName: topicName || null,
            subtopicName: subtopicName || null,
            totalQuestions,
            correctAnswers,
            score,
            timeSpent,
            answers: answers.map(a => ({
                questionIndex: a.questionIndex,
                selectedOption: a.selectedOption,
                isCorrect: a.isCorrect
            }))
        });

        const savedQuizScore = await quizScore.save();

        res.status(201).json({
            success: true,
            message: 'Quiz submitted successfully',
            data: savedQuizScore
        });

    } catch (error) {
        console.error('Error in submitQuiz:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting quiz'
        });
    }
});


{/*
// @route   GET /api/leaderboard/:videoId
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
};*/}


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