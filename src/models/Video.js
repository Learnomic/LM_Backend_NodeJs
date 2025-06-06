import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
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
    videoUrl: {
        type: String,
        required: true
    }
}, {
    collection: 'Videos',
    timestamps: true
});

// Add indexes for frequently queried fields
videoSchema.index({ subName: 1, chapterName: 1, topicName: 1, subtopicName: 1 });
videoSchema.index({ videoUrl: 1 }, { unique: true });

const Video = mongoose.model('Video', videoSchema);

export default Video; 