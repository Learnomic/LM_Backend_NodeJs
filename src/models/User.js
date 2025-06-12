// models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return !this.isGoogleUser; // Password required only for non-Google users
    },
    minlength: [6, 'Password must be at least 6 characters']
  },
  profilePicture: {
    type: String
  },
  isGoogleUser: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  board: {
    type: String,
    enum: ['CBSE', 'ICSE', 'State Board'],
    required: false // Made optional
  },
  grade: {
    type: String,
    required: false // Made optional
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  credential_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserCredential', // Reference to the UserCredential model
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
  completedVideos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  }],
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  collection: 'Users', // Explicitly set collection name
  timestamps: true // Assuming you want timestamps like other models
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

// Compare password method
UserSchema.methods.matchPassword = async function(enteredPassword) {
  if (this.isGoogleUser) {
    return false; // Google users can't use password login
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", UserSchema);
export default User;