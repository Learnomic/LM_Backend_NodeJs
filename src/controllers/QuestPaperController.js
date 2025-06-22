import Quiz from '../models/Quiz.js';
import QuestionPaper from '../models/QuestPaperSchema.js';
import Video from '../models/Video.js';

function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

// Generate Question Paper
export const generateQuestionPaper = async (req, res) => {
  try {
    const { subName, board, grade, medium } = req.body;
    const userId = req.user._id;

    if (!subName || !board || !grade || !userId) {
      return res.status(400).json({ message: 'subName, board, grade are required, and user must be authenticated' });
    }

    const query = { subName, board, grade };
    if (medium && medium.trim() !== '') {
      query.medium = medium;
    }

    const quizzes = await Quiz.find(query);

    if (!quizzes.length) {
      return res.status(404).json({ message: 'No quizzes found for the given criteria' });
    }

    const allQuestions = quizzes
      .flatMap(q => q.questions)
.filter(q => {
  const opt = q.opt;
  return opt &&
    typeof opt === 'object' &&
    ['a', 'b', 'c', 'd'].every(k => typeof opt[k] === 'string' && opt[k].trim() !== '');
});

    if (allQuestions.length < 25) {
      return res.status(400).json({ message: 'Not enough questions available to generate paper' });
    }

    const shuffled = shuffleArray(allQuestions).slice(0, 25);

    const paper = new QuestionPaper({
      userId,
      subject: subName,
      grade,
      board,
      medium: medium?.trim() || undefined,
      questions: shuffled,
      userAnswers: [],
      score: 0
    });

    await paper.save();

    res.status(201).json({ message: 'Question paper generated successfully', data: paper });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Submit Question Paper
export const submitQuestionPaper = async (req, res) => {
  try {
    const { paperId, answers } = req.body;
    const userId = req.user._id;

    const paper = await QuestionPaper.findById(paperId);
    if (!paper)
      return res.status(404).json({ message: 'Question paper not found' });

    if (answers.length !== paper.questions.length)
      return res.status(400).json({ message: 'All questions must be answered' });

    let score = 0;
    paper.questions.forEach((q, i) => {
      if (q.correctAnswer === answers[i]) score++;
    });

    paper.userAnswers = answers;
    paper.score = score;

    await paper.save();
    res.status(200).json({ message: 'Answers submitted', score, total: paper.questions.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to submit answers' });
  }
};
