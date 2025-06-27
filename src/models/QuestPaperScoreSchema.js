// models/QuestPaperScoreSchema.js
import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionIndex: Number,
  selectedOption: String,
  isCorrect: Boolean
}, { _id: false });

const questPaperScoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjectName: String,
  totalQuestions: Number,
  correctAnswers: Number,
  score: Number,
  timeSpent: Number,
  answers: [answerSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const QuestPaperScore = mongoose.model('QuestPaperScore', questPaperScoreSchema);
export default QuestPaperScore;
