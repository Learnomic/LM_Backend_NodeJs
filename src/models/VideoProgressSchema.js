// models/VideoProgress.js
import mongoose from 'mongoose';

const VideoProgressSchema = new mongoose.Schema({
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true,
  },
  currentTime: {
    type: Number,
    default: 0,
    min: 0,
  },
  lastWatched: {
    type: Date,
    default: Date.now,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  totalWatchTime: {
    type: Number,
    default: 0,
  },
}, { _id: false });

export default VideoProgressSchema;
