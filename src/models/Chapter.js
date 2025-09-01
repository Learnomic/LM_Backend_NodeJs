import mongoose from 'mongoose';

const subtopicSchema = new mongoose.Schema({
    subtopicname: { type: String, required: true, trim: true }
}, { _id: true });

const topicSchema = new mongoose.Schema({
    topicname: { type: String, required: true, trim: true },
    subtopics: { type: [subtopicSchema], default: [] }
}, { _id: true });

const chapterSchema = new mongoose.Schema({
    chaptername: {
        type: String,
        required: true,
        trim: true
    },
    subjectname: {
        type: String,
        required: false,
        trim: true
    },
    subjectid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
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
        type: [String],
        required: false,
        default: []
    },
    topics: {
        type: [topicSchema],
        default: []
    }
}, {
    timestamps: true,
    collection: 'Chapters'
});

const Chapter = mongoose.models.Chapter || mongoose.model('Chapter', chapterSchema);
export default Chapter;
