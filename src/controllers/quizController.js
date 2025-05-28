import QuizScore from '../models/QuizScore.js';
import Video from '../models/Video.js';
import Quiz from '../models/Quiz.js';
import Subject from '../models/Subject.js';
import Topic from '../models/Topic.js';
import User from '../models/User.js';
import { validationResult } from 'express-validator';
import { checkAndAwardBadges } from './dashboardController.js'; // Import checkAndAwardBadges

// Assuming you use express-validator for validation in routes

export const submitQuiz = async (req, res) => {
  // 1. Validate inputs (you might want more detailed validation here)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    console.log('Request Body:', req.body);
    const {
      quizId,
      userId, // Assuming userId is part of the request body or derived from auth
      videoId, // This is the video document ObjectId string
      timeSpent,
      answers, // [{ questionIndex, selectedOption, isCorrect }]
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      score,
      subject, // Subject name from request body
      // Other curriculum fields will be fetched
    } = req.body;

    // Use userId from JWT token payload if available, otherwise use from body (adjust as per auth setup)
    const submissionUserId = req.user ? req.user._id : userId; // Assuming req.user from authMiddleware

    // 2. Fetch Video document to get curriculum names
    console.log('Attempting to find Video with ID:', videoId);
    const video = await Video.findById(videoId);
    console.log('Video find result:', video);

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // 3. Fetch Subject document using name from Video document
    console.log('Attempting to find Subject with name:', video.subName);
    const subjectDoc = await Subject.findOne({ subject: video.subName });
    console.log('Subject find result:', subjectDoc);

     if (!subjectDoc) {
       return res.status(404).json({ message: 'Subject not found' });
     }

    // 4. Fetch Topic document using name from Video document
    console.log('Attempting to find Topic with name:', video.topicName);
    const topicDoc = await Topic.findOne({ topicName: video.topicName });
    console.log('Topic find result:', topicDoc);

     if (!topicDoc) {
       return res.status(404).json({ message: 'Topic not found' });
     }

    // 5. Construct data for QuizScore document
    console.log('Subject Doc:', subjectDoc);
    console.log('Topic Doc:', topicDoc);
    console.log('Video Chapter Name:', video.chapterName);
    console.log('Video Subtopic Name:', video.subtopicName);
    if (subjectDoc) console.log('Subject ID:', subjectDoc._id);
    if (topicDoc) console.log('Topic ID:', topicDoc._id);
    if (subjectDoc) console.log('Subject Name from Doc:', subjectDoc.subject);
    if (topicDoc) console.log('Topic Name from Doc:', topicDoc.topicName);

    const quizScoreData = {
      quizId,
      userId: submissionUserId,
      videoId: videoId, // Use the videoId string from the request body
      subjectId: subjectDoc._id,
      topicId: topicDoc._id,
      subjectName: subjectDoc.subject, // Corrected to use .subject
      topicName: topicDoc.topicName,     // Corrected to use .topicName
      chapterName: video.chapterName, // Use name from fetched video doc
      subtopicName: video.subtopicName, // Use name from fetched video doc
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      score,
      timeSpent,
      answers,
      completed: true, // Assuming a submitted quiz is completed
      // timestamps are automatically added by schema
    };

    // 6. Create and store quiz score document
    const quizScore = new QuizScore(quizScoreData);

    // 7. Save the quiz score
    console.log('Saving quiz score:', quizScore);
    await quizScore.save();
    console.log('Quiz score saved successfully.');

    // 8. Check and award badges
    console.log('Calling checkAndAwardBadges for user:', submissionUserId);
    // Fetch the updated user document after saving the quiz score
    const updatedUser = await User.findById(submissionUserId);
    if (updatedUser) {
      console.log('User document before badge check:', updatedUser);
      const awardedBadges = await checkAndAwardBadges(updatedUser);
      console.log('Awarded badges:', awardedBadges);

      // Mark video as completed
      if (videoId && !updatedUser.completedVideos.includes(videoId)) {
        updatedUser.completedVideos.push(videoId);
        await updatedUser.save();
        console.log(`Video ${videoId} marked as completed for user ${submissionUserId}`);
      }

      // The checkAndAwardBadges function updates the user document directly
    } else {
      console.warn('User not found after saving quiz score.');
    }

    // 9. Send success response in the desired format
    const responseBody = {
      _id: quizScore._id,
      userId: quizScore.userId,
      quizId: quizScore.quizId,
      videoId: quizScore.videoId,
      subjectId: quizScore.subjectId,
      topicId: quizScore.topicId,
      subjectName: quizScore.subjectName,
      topicName: quizScore.topicName,
      chapterName: quizScore.chapterName,
      subtopicName: quizScore.subtopicName,
      score: quizScore.score,
      totalQuestions: quizScore.totalQuestions,
      correctAnswers: quizScore.correctAnswers,
      wrongAnswers: quizScore.wrongAnswers,
      answers: quizScore.answers,
      timeSpent: quizScore.timeSpent,
      timestamp: quizScore.createdAt, // Use createdAt from timestamps
      completed: quizScore.completed
    };

    res.status(201).json(responseBody);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while submitting quiz score' });
  }
};


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

export const getQuizByVideoUrl = async (req, res) => {
  try {
    const { videoUrl: rawVideoUrl } = req.query;
    const videoUrl = rawVideoUrl ? rawVideoUrl.trim() : null;

    console.log('Received videoUrl:', videoUrl);

    if (!videoUrl) {
      return res.status(400).json({ message: 'videoUrl query parameter is required' });
    }

    // Escape special regex characters in the videoUrl
    const escapedVideoUrl = videoUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Query using regex
    const quiz = await Quiz.findOne({ videoUrl: new RegExp(escapedVideoUrl, 'i') });

    console.log('Quiz find result:', quiz);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found for this videoUrl' });
    }

    res.status(200).json({ quiz });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error while fetching quiz' });
  }
};



// import { validationResult } from 'express-validator';
// import Quiz from '../models/Quiz.js';
// import QuizSubmission from '../models/QuizSubmission.js';

// export const submitQuiz = async (req, res) => {
//   // 1. Validate inputs
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ errors: errors.array() });
//   }

//   try {
//     const {
//       quizId,
//       userId,
//       videoId,
//       timeSpent,
//       answers, // [{ questionIndex, selectedOption }]
//     } = req.body;

//     // 2. Fetch original quiz to compare answers
//     const quiz = await Quiz.findById(quizId);
//     if (!quiz) {
//       return res.status(404).json({ error: 'Quiz not found' });
//     }

//     const correctAnswers = answers.filter(ans => {
//       const original = quiz.questions[ans.questionIndex];
//       return original && original.correctOption === ans.selectedOption;
//     });

//     const totalQuestions = answers.length;
//     const correct = correctAnswers.length;
//     const wrong = totalQuestions - correct;
//     const score = Math.round((correct / totalQuestions) * 100);

//     // 3. Add `isCorrect` field to each answer
//     const processedAnswers = answers.map(ans => {
//       const original = quiz.questions[ans.questionIndex];
//       const isCorrect = original?.correctOption === ans.selectedOption;
//       return {
//         questionIndex: ans.questionIndex,
//         selectedOption: ans.selectedOption,
//         isCorrect,
//       };
//     });

//     // 4. Create and store submission
//     const submission = new QuizSubmission({
//       quizId,
//       userId,
//       videoId,
//       totalQuestions,
//       correctAnswers: correct,
//       wrongAnswers: wrong,
//       score,
//       timeSpent,
//       answers: processedAnswers,
//       submittedAt: new Date(),
//     });

//     await submission.save();

//     res.status(201).json({ message: 'Quiz submitted successfully', score });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Server error while submitting quiz' });
//   }
// };
