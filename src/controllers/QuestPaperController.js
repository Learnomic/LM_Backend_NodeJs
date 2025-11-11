import Quiz from '../models/VideosQuiz.js';
import QuestionPaper from '../models/QuestPaperSchema.js';
import QuestPaperScore from '../models/QuestPaperScoreSchema.js';

function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

// Generate Question Paper
export const generateQuestionPaper = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized: user not authenticated' });
    }

    const { subName, board, grade, medium } = req.body;
    const userId = req.user._id;
    console.log("Payload received:", { userId, subName, board, grade, medium });

    if (!subName || !board || !grade || !userId) {
      return res.status(400).json({ message: 'subName, board, grade are required, and user must be authenticated' });
    }

    const query = {
      subName: new RegExp(`^${subName}$`, 'i'),
      board: new RegExp(`^${board}$`, 'i'),
      grade: new RegExp(`^${grade}$`, 'i')
    };

    if (medium && medium.trim() !== '') {
      query.medium = { $in: [new RegExp(`^${medium.trim()}$`, 'i')] };
    }

    const quizzes = await Quiz.find(query);
    console.log(`Found ${quizzes.length} quizzes for query:`, query);

    if (!quizzes.length) {
      return res.status(404).json({ message: 'No quizzes found for the given criteria' });
    }

    const allQuestions = quizzes.flatMap(q => q.questions).filter(q => {
      const opt = q.opt;
      return opt &&
        typeof opt === 'object' &&
        ['a', 'b', 'c', 'd'].every(k => typeof opt[k] === 'string' && opt[k].trim() !== '');
    });

    console.log(`Total valid questions found: ${allQuestions.length}`);

    if (allQuestions.length < 25) {
      return res.status(400).json({ 
        message: 'Not enough questions available to generate paper', 
        available: allQuestions.length 
      });
    }

    const shuffled = shuffleArray([...allQuestions]).slice(0, 25);

    const paper = new QuestionPaper({
      userId,
      subject: subName,
      grade,
      board,
      medium: medium?.trim() || undefined,
      questions: shuffled,
    });

    await paper.save();

    res.status(201).json({ 
      message: 'Question paper generated successfully', 
      data: paper,
      totalQuestions: allQuestions.length
    });
  } catch (err) {
    console.error('Error in generateQuestionPaper:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

export const submitQuestionPaperScore = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized: user not authenticated' });
    }

    const userId = req.user._id;
    const { paperId, answers, timeSpent } = req.body;

    console.log('Payload received:', { paperId, answers, timeSpent });

    if (!paperId || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'paperId and answers are required' });
    }

    const paper = await QuestionPaper.findById(paperId);
    if (!paper) {
      return res.status(404).json({ message: 'Question paper not found' });
    }

    const evaluatedAnswers = answers.map(({ questionIndex, selectedOption }) => {
      const actualQuestion = paper.questions[questionIndex];
      if (!actualQuestion) {
        throw new Error(`Invalid questionIndex ${questionIndex}`);
      }
      const isCorrect = actualQuestion.correctAnswer === selectedOption;
      return {
        questionIndex,
        selectedOption,
        isCorrect,
        correctAnswer: actualQuestion.correctAnswer,
        question: actualQuestion.que
      };
    });

    const correctAnswers = evaluatedAnswers.filter(ans => ans.isCorrect).length;
    const scorePercentage = (correctAnswers / paper.questions.length) * 100;

    const resultDoc = new QuestPaperScore({
      userId,
      paperId,
      subjectName: paper.subject,
      totalQuestions: paper.questions.length,
      correctAnswers,
      score: correctAnswers,
      scorePercentage,
      timeSpent: timeSpent || 0,
      answers: evaluatedAnswers
    });

    await resultDoc.save();

    res.status(201).json({ 
      message: 'Score submitted successfully', 
      data: resultDoc,
      summary: {
        correct: correctAnswers,
        total: paper.questions.length,
        percentage: scorePercentage.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error in submitQuestionPaperScore:', error);
    res.status(500).json({ message: 'Failed to submit score', error: error.message });
  }
};