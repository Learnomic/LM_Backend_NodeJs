import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionIndex: {
    type: Number,
    required: true,
  },
  selectedOption: {
    type: String,
    required: true,
  },
  isCorrect: {
    type: Boolean,
    required: true,
  },
});

const quizScoreSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true,
        index: true
    },
    videoId: {
        type: String,
        required: true,
        index: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true,
        index: true
    },
    subjectName: {
        type: String,
        required: true,
        index: true
    },
    topicId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Topic',
        required: true,
        index: true
    },
    topicName: {
        type: String,
        required: true,
        index: true
    },
    chapterName: {
        type: String,
        default: null,
        index: true
    },
    subtopicName: {
        type: String,
        default: null,
        index: true
    },
    score: {
        type: Number,
        required: true,
        index: true
    },
    totalQuestions: {
        type: Number,
        required: true
    },
    correctAnswers: {
        type: Number,
        required: true
    },
    answers: {
        type: [answerSchema],
        required: true
    },
    timeSpent: {
        type: Number,
        required: true
    },
    completed: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: true
});

quizScoreSchema.index({ userId: 1, completed: 1 });
quizScoreSchema.index({ subjectId: 1, completed: 1 });
quizScoreSchema.index({ topicId: 1, completed: 1 });
quizScoreSchema.index({ score: -1, completed: 1 });
quizScoreSchema.index({ createdAt: -1, completed: 1 });

const QuizScore = mongoose.model('QuizScore', quizScoreSchema, 'QuizScores');

export default QuizScore; 