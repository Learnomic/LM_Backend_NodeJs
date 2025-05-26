import mongoose from 'mongoose';

const quizHistorySchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        quizTitle: {
            type: String,
            required: true,
        },
        score: {
            type: Number,
            required: true,
        },
        dateTaken: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

const QuizHistory = mongoose.model('QuizHistory', quizHistorySchema);

export default QuizHistory;
