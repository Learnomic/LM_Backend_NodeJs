import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
    quizId: String,
    userId: String,
    videoId: String,
    totalQuestions: Number,
    correctAnswers: Number,
    wrongAnswers: Number,
    score: Number,
    timeSpent: Number,
    answers: [
        {
            questionIndex: Number,
            selectedOption: String,
            isCorrect: Boolean
        }
    ],
    timestamp: Date
});

export default mongoose.model('Result', resultSchema);