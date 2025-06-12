import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    selectedOption: {
        type: String,
        required: true
    },
    isCorrect: {
        type: Boolean,
        required: true
    }
});

const testScoreSchema = new mongoose.Schema({
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
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    subjectName: {
        type: String,
        required: true
    },
    score: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    totalQuestions: {
        type: Number,
        required: true,
        min: 1
    },
    correctAnswers: {
        type: Number,
        required: true,
        min: 0
    },
    answers: [answerSchema],
    timeSpent: {
        type: Number,
        required: true,
        min: 0
    },
    completed: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const TestScore = mongoose.model('TestScore', testScoreSchema);

export default TestScore; 