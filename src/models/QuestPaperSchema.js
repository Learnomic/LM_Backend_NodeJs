import mongoose from 'mongoose';

const questionPaperSchema = new mongoose.Schema({
  subject: String,
  grade: String,
  medium: String,
  board: String,
  questions: [
    {
      que: String,
      opt: {
        a: String,
        b: String,
        c: String,
        d: String
      },
      correctAnswer: String,
      explanation: String
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const QuestionPaper = mongoose.model('QuestionPaper', questionPaperSchema);

export default QuestionPaper;
