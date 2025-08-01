import mongoose from "mongoose";
import bcrypt from 'bcryptjs';
import VideoProgressSchema from "./VideoProgressSchema.js";

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
  password: {
    type: String,
    required: function() {
      return !this.isGoogleUser;
    },
    select: false // Don't include password by default in queries
  },
  board: {
    type: String,
    required: function() {
      return !this.isGoogleUser;
    }
  },
  grade: {
    type: String,
    required: function() {
      return !this.isGoogleUser;
    }
  },
  schoolName: {
    type: String,
    trim: true,
    default: ''
  },
  googleId: {
    type: String,
    sparse: true
  },
  isGoogleUser: {
    type: Boolean,
    default: false
  },
  profilePicture: {
    type: String,
    default: 'U'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  totalTimeSpent: {
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
  videoProgress: {
    type: [VideoProgressSchema],
    default: [],
  },
streak: {
  type: Number,
  default: 0,
},
lastVisited: {
  type: Date,
  default: null,
},
  resetPasswordOTP: {
    type: String,
    select: false
  },
  resetPasswordOTPExpiry: {
    type: Date,
    select: false
  }
}, {
  collection: 'Users',
  timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password') || this.isGoogleUser) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.matchPassword = async function(enteredPassword) {
  if (this.isGoogleUser) {
    return false;
  }

  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", UserSchema);

export default User;