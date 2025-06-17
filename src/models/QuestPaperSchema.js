import mongoose from 'mongoose';

const questionPaperSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  subject: String,
  videoId: String,
  videoUrl: String,
  questions: [
    {
      que: String,
      opt: {
        a: String,
        b: String,
        c: String,
        d: String
      },
      correctAnswer: String
    }
  ],
  userAnswers: [String],
  score: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const QuestionPaper = mongoose.model('QuestionPaper', questionPaperSchema);
export default QuestionPaper;
