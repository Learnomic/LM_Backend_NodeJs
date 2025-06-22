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
        board: {
        type: String,
        required: true,
        trim: true
    },
    grade: {
        type: String,
        required: true,
        trim: true
    },
    medium: {
        type: String,
        required: false,
        trim: true
    },
        subName: {
        type: String,
        required: true,
        trim: true
    },
    topicName: {
        type: String,
        required: true,
        trim: true
    },
    chapterName: {
        type: String,
        required: true,
        trim: true
    },
    subtopicName: {
        type: String,
        required: true,
        trim: true
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