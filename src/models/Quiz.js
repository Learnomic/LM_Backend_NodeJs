import mongoose from 'mongoose';


const quizSchema = new mongoose.Schema({
    videoId: {
        type: String,
        required: true
    },
    videoUrl: {
        type: String,
        required: true
    },
    questions: [
        {
            que: {
                type: String,
                required: true
            },
            opt: {
                a: String,
                b: String,
                c: String,
                d: String
            },
            correctAnswer: {
                type: String,
                required: true
            },
            explanation: String
        }
    ]
});

const Quiz = mongoose.model('Quiz', quizSchema, 'Quiz');

export default Quiz;