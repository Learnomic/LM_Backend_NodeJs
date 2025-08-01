// // models/VideoProgress.js
// import mongoose from 'mongoose';

// const VideoProgressSchema = new mongoose.Schema({
//   videoId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Video',
//     required: true,
//   },
//   currentTime: {
//     type: Number,
//     default: 0,
//     min: 0,
//   },
//   lastWatched: {
//     type: Date,
//     default: Date.now,
//   },
//   isCompleted: {
//     type: Boolean,
//     default: false,
//   },
//   totalWatchTime: {
//     type: Number,
//     default: 0,
//   },
//   board: { type: String },
// grade: { type: String },
// medium: { type: String }
// }, { _id: false });
// const VideoProgress = mongoose.model('VideoProgress', VideoProgressSchema);

// export default VideoProgressSchema;





// models/VideoProgress.js
import mongoose from 'mongoose';

const VideoProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
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
  board: { 
    type: String 
  },
  grade: { 
    type: String 
  },
  medium: { 
    type: String 
  }
}, {
  collection: 'VideoProgress',
  timestamps: true
});

// Create compound index to ensure one progress record per user-video combination
VideoProgressSchema.index({ userId: 1, videoId: 1 }, { unique: true });

// Index for efficient queries
VideoProgressSchema.index({ userId: 1, lastWatched: -1 });
VideoProgressSchema.index({ userId: 1, isCompleted: 1 });

const VideoProgress = mongoose.model('VideoProgress', VideoProgressSchema);

export default VideoProgress;