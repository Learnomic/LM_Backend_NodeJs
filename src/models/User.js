import mongoose from "mongoose";
import bcrypt from 'bcryptjs';

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
  // Link to UserCredential for non-Google users
  credential_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserCredential',
    required: function() {
      return !this.isGoogleUser; // Required only for non-Google users
    }
  },
  board: {
    type: String,
    required: function() {
      return !this.isGoogleUser; // Board required only for regular users
    }
  },
  grade: {
    type: String,
    required: function() {
      return !this.isGoogleUser; // Grade required only for regular users
    }
  },
  // Google Auth fields
  googleId: {
    type: String,
    sparse: true // Allows multiple null values
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
  // Optional fields for Google users
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
  collection: 'Users',
  timestamps: true
});

// Remove the password hashing middleware since password is now in UserCredential
// UserSchema.pre('save', async function(next) {
//   if (!this.isModified('password') || !this.password) {
//     return next();
//   }
//   
//   try {
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// Method to check password - now checks against linked UserCredential
UserSchema.methods.matchPassword = async function(enteredPassword) {
  if (this.isGoogleUser) {
    return false; // Google users don't have passwords
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