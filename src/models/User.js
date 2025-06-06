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
    required: function() { return !this.googleId; }, // Make optional for Google users
  },
  grade: {
    type: String,
    required: function() { return !this.googleId; }, // Make optional for Google users
  },
  credential_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserCredential', // Reference to the UserCredential model
    required: function() { return !this.googleId; } // Make optional for Google users
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows null values for unique index
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
  },
  lastLoginAt: { // Add last login timestamp field
    type: Date,
  },
  isVerified: { // Add isVerified field from the other model
      type: Boolean,
      default: false,
  }
}, {
  collection: 'Users', // Explicitly set collection name
  timestamps: true // Assuming you want timestamps like other models
});

const User=mongoose.model("User", UserSchema);
export default User;