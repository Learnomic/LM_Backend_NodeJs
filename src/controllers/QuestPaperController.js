import Quiz from '../models/Quiz.js'; // must be ESM compatible
import QuestionPaper from '../models/QuestPaperSchema.js';
import Video from '../models/Video.js';

function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

export const generateQuestionPaper = async (req, res) => {
  try {
    const { subName, userId } = req.body;

    if (!subName || !userId)
      return res.status(400).json({ message: 'subName and userId required' });

    // Fetch all quizzes from the given subject
    const quizzes = await Quiz.find({ subName });

    if (!quizzes.length)
      return res.status(404).json({ message: 'No quizzes found for this subject' });

  const allQuestions = quizzes
  .flatMap(q => q.questions)
  .filter(q => q.opt && Object.keys(q.opt).length === 4);

    if (allQuestions.length < 25)
      return res.status(400).json({ message: 'Not enough questions in this subject' });

    const shuffled = shuffleArray(allQuestions).slice(0, 25);

    const paper = new QuestionPaper({
      userId,
      subject: subName,
      videoId: null,
      videoUrl: null,
      questions: shuffled,
      userAnswers: [],
      score: 0
    });

    await paper.save();

    res.status(201).json({ message: 'Question paper generated for subject', data: paper });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};


export const submitQuestionPaper = async (req, res) => {
  try {
    const { paperId, answers } = req.body;

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
