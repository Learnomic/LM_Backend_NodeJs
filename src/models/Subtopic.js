import mongoose from 'mongoose';

const subtopicSchema = new mongoose.Schema({
    subName: {
        type: String,
        required: true,
        trim: true
    },
    chapterName: {
        type: String,
        required: true,
        trim: true
    },
    topicName: {
        type: String,
        required: true,
        trim: true
    },
    subtopicName: {
        type: String,
        required: true,
        trim: true
    }
}, {
    collection: 'Subtopics',
    timestamps: true
});

// Add indexes for frequently queried fields
subtopicSchema.index({ subName: 1, chapterName: 1, topicName: 1 });
subtopicSchema.index({ subName: 1, chapterName: 1, topicName: 1, subtopicName: 1 }, { unique: true });

const Subtopic = mongoose.model('Subtopic', subtopicSchema);

export default Subtopic; 