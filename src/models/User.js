// // models/User.js
// import mongoose from "mongoose";

// const UserSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true,
//     trim: true,
//   },
//   email: {
//     type: String,
//     required: true,
//     unique: true,
//     lowercase: true,
//   },
//   // password is not stored directly in Users collection, but in UserCredentials
//   board: {
//     type: String,
//     required: true,
//   },
//   grade: {
//     type: String,
//     required: true,
//   },
//   credential_id: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'UserCredential', // Reference to the UserCredential model
//     required: true
//   },
//   school: {
//     type: String
//   },
//   div: {
//     type: String
//   },
//   pincode: {
//     type: String
//   },
//   badges: {
//     type: [String],
//     default: []
//   },
//   totalTimeSpent: {
//     type: Number,
//     default: 0
//   },
//   currentStreak: {
//     type: Number,
//     default: 0
//   },
//   longestStreak: {
//     type: Number,
//     default: 0
//   },
//   totalPoints: {
//     type: Number,
//     default: 0
//   },
//   experience: {
//     type: Number,
//     default: 0
//   },
//   completedVideos: {
//     type: [String],
//     default: []
//   }
// }, {
//   collection: 'Users', // Explicitly set collection name
//   timestamps: true // Assuming you want timestamps like other models
// });

// const User=mongoose.model("User", UserSchema);
// export default User;







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
  password: {
    type: String,
    required: function() {
      return !this.isGoogleUser; // Password required only for non-Google users
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
    default: ''
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

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
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

// Method to check password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", UserSchema);
export default User;