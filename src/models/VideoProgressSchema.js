// models/VideoProgress.js
import mongoose from 'mongoose';

// Sub-schema for individual video progress
const VideoProgressItemSchema = new mongoose.Schema({
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
  _id: false, // Disable _id for sub-documents to avoid unnecessary ObjectIds
  timestamps: false // Handle timestamps at parent level
});

// Main schema for user's video progress
const VideoProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // One document per user
  },
  videoProgress: [VideoProgressItemSchema], // Array of video progress items
  lastActivity: {
    type: Date,
    default: Date.now,
  }
}, {
  collection: 'VideoProgress',
  timestamps: true
});

// Indexes for efficient queries
VideoProgressSchema.index({ userId: 1 }); // Primary index on userId
VideoProgressSchema.index({ userId: 1, lastActivity: -1 }); // For recent activity queries
VideoProgressSchema.index({ "videoProgress.videoId": 1 }); // For video-specific queries
VideoProgressSchema.index({ "videoProgress.isCompleted": 1 }); // For completion queries
VideoProgressSchema.index({ "videoProgress.lastWatched": -1 }); // For recently watched queries

// Methods to work with the array structure
VideoProgressSchema.methods.updateVideoProgress = function(videoId, progressData) {
  const existingIndex = this.videoProgress.findIndex(
    item => item.videoId.toString() === videoId.toString()
  );
  
  if (existingIndex !== -1) {
    // Update existing progress
    Object.assign(this.videoProgress[existingIndex], progressData);
    this.videoProgress[existingIndex].lastWatched = new Date();
  } else {
    // Add new progress entry
    this.videoProgress.push({
      videoId,
      ...progressData,
      lastWatched: new Date()
    });
  }
  
  this.lastActivity = new Date();
  return this.save();
};

VideoProgressSchema.methods.getVideoProgress = function(videoId) {
  return this.videoProgress.find(
    item => item.videoId.toString() === videoId.toString()
  );
};

VideoProgressSchema.methods.removeVideoProgress = function(videoId) {
  this.videoProgress = this.videoProgress.filter(
    item => item.videoId.toString() !== videoId.toString()
  );
  this.lastActivity = new Date();
  return this.save();
};

VideoProgressSchema.methods.getCompletedVideos = function() {
  return this.videoProgress.filter(item => item.isCompleted);
};

VideoProgressSchema.methods.getRecentlyWatched = function(limit = 10) {
  return this.videoProgress
    .sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched))
    .slice(0, limit);
};

const VideoProgress = mongoose.model('VideoProgress', VideoProgressSchema);

export default VideoProgress;