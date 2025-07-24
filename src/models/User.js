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
  credential_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserCredential',
    required: function () {
      return !this.isGoogleUser;
    }
  },
  board: {
    type: String,
    required: function () {
      return !this.isGoogleUser;
    }
  },
  grade: {
    type: String,
    required: function () {
      return !this.isGoogleUser;
    }
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
   videoProgress: {
    type: [VideoProgressSchema],
    default: [],
  },
}, {
  collection: 'Users',
  timestamps: true
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
  if (this.isGoogleUser) {
    return false;
  }

  try {
    const UserCredential = mongoose.model('UserCredential');
    const credential = await UserCredential.findById(this.credential_id);

    if (!credential) {
      return false;
    }

    return await bcrypt.compare(enteredPassword, credential.password);
  } catch (error) {
    console.error('Error matching password:', error);
    return false;
  }
};

const User = mongoose.model("User", UserSchema);

export default User;