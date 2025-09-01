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
    videoId: {  // ✅ directly link to VideosQuiz
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VideosQuiz',
        required: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    chapterId: {   // ✅ since chapters exist
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chapter',
        default: null
    },
    subjectName: { type: String, required: true },
    chapterName: { type: String, required: true },
    
    // topic & subtopic optional
    topicName: { type: String, default: null },
    subtopicName: { type: String, default: null },

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
        type: [{
            questionIndex: { type: Number, required: true },
            selectedOption: { type: String, required: true },
            isCorrect: { type: Boolean, required: true }
        }],
        required: true
    },
    timeSpent: { type: Number, required: true },
    completed: { type: Boolean, default: true }
}, {
    timestamps: true
});

const QuizScore = mongoose.model('QuizScore', quizScoreSchema, 'QuizScores');

export default QuizScore; 