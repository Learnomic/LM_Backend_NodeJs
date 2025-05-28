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
        type: String, // As per desired format
        required: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    topicId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Topic',
        required: true
    },
    subjectName: {
        type: String,
        required: true
    },
    topicName: {
        type: String,
        required: true
    },
    chapterName: {
        type: String,
        default: null // Can be null
    },
    subtopicName: {
        type: String,
        required: true
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
    wrongAnswers: {
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
        default: true // Assuming submission means completed
    }
}, {
    timestamps: true // Adds createdAt and updatedAt (which can serve as timestamp)
});

const QuizScore = mongoose.model('QuizScore', quizScoreSchema, 'QuizScores'); // Specify collection name

export default QuizScore; 