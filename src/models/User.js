// models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  // password is not stored directly in Users collection, but in UserCredentials
  board: {
    type: String,
    required: true,
  },
  grade: {
    type: String,
    required: true,
  },
  credential_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserCredential', // Reference to the UserCredential model
    required: true
  },
  school: {
    type: String
  },
  div: {
    type: String
  },
  pincode: {
    type: String
  },
  badges: {
    type: [String],
    default: []
  },
  totalTimeSpent: {
    type: Number,
    default: 0
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  experience: {
    type: Number,
    default: 0
  },
  completedVideos: {
    type: [String],
    default: []
  }
}, {
  collection: 'Users', // Explicitly set collection name
  timestamps: true // Assuming you want timestamps like other models
});

const User=mongoose.model("User", UserSchema);
export default User;