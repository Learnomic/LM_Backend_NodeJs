import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
    que: { type: String, required: true },
    opt: {
        a: { type: String, required: true },
        b: { type: String, required: true },
        c: { type: String, required: true },
        d: { type: String, required: true }
    },
    correctAnswer: { type: String, required: true },
    explanation: { type: String, required: true }
}, { _id: false });

const VideosQuizSchema = new mongoose.Schema({
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    subName: {
        type: String,
        required: true,
        trim: true
    },
    topicName: {
        type: String,
        required: false,
        trim: true
    },
    chapterName: {
        type: String,
        required: true,
        trim: true
    },
    subtopicName: {
        type: String,
        required: false,
        trim: true
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
        type: [String],
        required: false,
        default: []
    },
    totalDuration: {
        type: Number, // Duration in seconds
        default: null
    },
    thumbnail: {
        type: String,
        default: null
    },
    videoUrl: { type: String, required: true },
    ytId: { type: String, required: false },
    url: { type: String, required: true },
    questions: { type: [questionSchema], default: [] }
}, {
    timestamps: true,
    collection: 'VideosQuiz'
});

// Add index for better query performance
VideosQuizSchema.index({ subName: 1, board: 1, grade: 1, medium: 1 });

const VideosQuiz = mongoose.models.VideosQuiz || mongoose.model('VideosQuiz', VideosQuizSchema);
export default VideosQuiz;