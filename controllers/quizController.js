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
