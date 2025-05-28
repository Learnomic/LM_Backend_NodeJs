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
        required: true
    },
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true
    },
    videoId: {
        type: String,
        required: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    subjectName: {
        type: String,
        required: true
    },
    topicId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Topic',
        required: true
    },
    topicName: {
        type: String,
        required: true
    },
    chapterName: {
        type: String,
        default: null
    },
    subtopicName: {
        type: String,
        default: null
    },
    score: {
        type: Number,
        required: true
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
        default: true
    }
}, {
    timestamps: true
});

const QuizScore = mongoose.model('QuizScore', quizScoreSchema, 'QuizScores');

export default QuizScore; 