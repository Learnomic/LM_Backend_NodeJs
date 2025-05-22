import QuizSubmission from '../models/QuizSubmission.js';
import { validationResult } from 'express-validator';

// Assuming you use express-validator for validation in routes

export const submitQuiz = async (req, res) => {
  try {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Extract from body
    const {
      quizId,
      videoId,
      subject,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      score,
      timeSpent,
      answers
    } = req.body;

    // Use userId from JWT token payload (set by auth middleware)
    const userId = req.user._id;

    const newSubmission = new QuizSubmission({
      quizId,
      userId,
      videoId,
      subject,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      score,
      timeSpent,
      answers,
      timestamp: new Date()
    });

    await newSubmission.save();

    res.status(201).json({ message: 'Quiz submitted successfully', submission: newSubmission });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const getLeaderboard = async (req, res) => {
  try {
    const { quizId } = req.params;

    const leaderboard = await QuizSubmission.find({ quizId })
      .sort({ score: -1, timeSpent: 1 }) // higher score, faster time
      .limit(10)
      .select('userId score timeSpent submittedAt');

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

    const history = await QuizSubmission.find({ userId })
      .sort({ timestamp: -1 }) // Make sure your model uses `timestamp` instead of `submittedAt`
      .select('quizId videoId score correctAnswers wrongAnswers timestamp');

    res.json({ history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching user history' });
  }
};




export const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    const submissions = await QuizSubmission.find({ userId });

    if (!submissions.length) {
      return res.json({
        averageScore: 0,
        highestScore: 0,
        completedVideos: 0,
        totalQuizzes: 0,
        achievements: {},
        chartData: {},
      });
    }

    // Calculations
    const totalQuizzes = submissions.length;
    const totalScore = submissions.reduce((sum, sub) => sum + sub.score, 0);
    const highestScore = Math.max(...submissions.map((s) => s.score));
    const averageScore = parseFloat((totalScore / totalQuizzes).toFixed(2));
    const completedVideos = new Set(submissions.map((s) => s.videoId)).size;

    // Achievements
    const perfectScoreCount = submissions.filter((s) => s.score === 100).length;
    const highPerformer = averageScore >= 80;
    const subjectsAttempted = new Set(submissions.map((s) => s.subject)).size;

    // Weekly Warrior logic (simplified)
    const streakDays = new Set(submissions.map((s) =>
      new Date(s.timestamp).toISOString().slice(0, 10)
    ));
    const weeklyStreak = streakDays.size >= 7;

    // Chart: Score Distribution
    const scoreBuckets = { low: 0, mid: 0, high: 0 };
    submissions.forEach((s) => {
      if (s.score <= 50) scoreBuckets.low++;
      else if (s.score <= 80) scoreBuckets.mid++;
      else scoreBuckets.high++;
    });

    // Chart: Quizzes per Subject
    const quizzesBySubject = {};
    submissions.forEach((s) => {
      quizzesBySubject[s.subject] = (quizzesBySubject[s.subject] || 0) + 1;
    });

    res.json({
      averageScore,
      highestScore,
      completedVideos,
      totalQuizzes,

      achievements: {
        firstSteps: totalQuizzes >= 1,
        quizApprentice: totalQuizzes,
        quizMaster: totalQuizzes,
        perfectScoreCount,
        highPerformer,
        subjectExplorer: subjectsAttempted,
        weeklyWarrior: weeklyStreak,
      },

      chartData: {
        scoreDistribution: scoreBuckets,
        quizzesBySubject,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error generating dashboard" });
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
