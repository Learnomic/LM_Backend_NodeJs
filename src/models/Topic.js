import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema({
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    chapterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chapter',
        required: true
    },
    topicName: {
        type: String,
        required: true,
        trim: true
    }
}, {
    collection: 'Topics',
    timestamps: true
});

const Topic = mongoose.model('Topic', topicSchema);

export default Topic; 