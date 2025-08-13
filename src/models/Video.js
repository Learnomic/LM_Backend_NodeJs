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
    },
    totalDuration: {
        type: Number, // Duration in seconds
        default: null
    },
    thumbnail: {
        type: String,
        default: null
    }
}, {
    collection: 'Videos',
    timestamps: true
});

const Video = mongoose.model('Video', videoSchema);

export default Video;