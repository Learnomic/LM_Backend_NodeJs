import mongoose from 'mongoose';


const quizSchema = new mongoose.Schema({
    videoId: String,
    questions: [
        {
            que: String,
            opt: {
                a: String,
                b: String,
                c: String,
                d: String
            },
            correctAnswer: String,
            explanation: String
        }
    ]
});

export default mongoose.model('Quiz', quizSchema);