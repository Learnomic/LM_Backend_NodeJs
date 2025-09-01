// // models/User.js
// import mongoose from "mongoose";
// import bcrypt from 'bcryptjs';

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
//   password: {
//     type: String,
//     required: function() {
//       return !this.isGoogleUser;
//     },
//     select: false // Don't include password by default in queries
//   },
//   board: {
//     type: String,
//     required: function() {
//       return !this.isGoogleUser;
//     }
//   },
//   grade: {
//     type: String,
//     required: function() {
//       return !this.isGoogleUser;
//     }
//   },
// medium: {
//   type: [String], 
//   default: []
// },
//   schoolName: {
//     type: String,
//     trim: true,
//     default: ''
//   },
//   googleId: {
//     type: String,
//     sparse: true
//   },
//   isGoogleUser: {
//     type: Boolean,
//     default: false
//   },
//   profilePicture: {
//     type: String,
//     default: 'U'
//   },
//   isVerified: {
//     type: Boolean,
//     default: false
//   },
//   // New field for counting completed videos
//   completedVideosCount: {
//     type: Number,
//     default: 0,
//     min: 0
//   },
//   streak: {
//     type: Number,
//     default: 0,
//   },
//   lastVisited: {
//     type: Date,
//     default: null,
//   },
//   resetPasswordOTP: {
//     type: String,
//     select: false
//   },
//   resetPasswordOTPExpiry: {
//     type: Date,
//     select: false
//   }
// }, {
//   collection: 'Users',
//   timestamps: true
// });

// // Virtual field to get video progress (optional - for easier querying)
// UserSchema.virtual('videoProgress', {
//   ref: 'VideoProgress',
//   localField: '_id',
//   foreignField: 'userId'
// });

// // Ensure virtual fields are included when converting to JSON
// UserSchema.set('toJSON', { virtuals: true });
// UserSchema.set('toObject', { virtuals: true });

// // Hash password before saving
// UserSchema.pre('save', async function(next) {
//   if (!this.isModified('password') || this.isGoogleUser) {
//     return next();
//   }

//   try {
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// // Method to compare passwords
// UserSchema.methods.matchPassword = async function(enteredPassword) {
//   if (this.isGoogleUser) {
//     return false;
//   }

//   return await bcrypt.compare(enteredPassword, this.password);
// };

// // Method to increment completed videos count
// UserSchema.methods.incrementCompletedVideos = async function() {
//   this.completedVideosCount += 1;
//   return await this.save();
// };

// // Method to decrement completed videos count (if needed for uncompleting videos)
// UserSchema.methods.decrementCompletedVideos = async function() {
//   if (this.completedVideosCount > 0) {
//     this.completedVideosCount -= 1;
//     return await this.save();
//   }
//   return this;
// };

// const User = mongoose.model("User", UserSchema);

// export default User;




// models/User.js (Updated to include FCM token)
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
  medium: {
    type: [String], 
    default: []
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
  // FCM token for push notifications
  fcmToken: {
    type: String,
    default: null
  },
  // New field for counting completed videos
  completedVideosCount: {
    type: Number,
    default: 0,
    min: 0
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

// Virtual field to get video progress (optional - for easier querying)
UserSchema.virtual('videoProgress', {
  ref: 'VideoProgress',
  localField: '_id',
  foreignField: 'userId'
});

// Ensure virtual fields are included when converting to JSON
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

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

// Method to update FCM token
UserSchema.methods.updateFCMToken = async function(token) {
  this.fcmToken = token;
  return await this.save();
};

// Method to increment completed videos count
UserSchema.methods.incrementCompletedVideos = async function() {
  this.completedVideosCount += 1;
  return await this.save();
};

// Method to decrement completed videos count (if needed for uncompleting videos)
UserSchema.methods.decrementCompletedVideos = async function() {
  if (this.completedVideosCount > 0) {
    this.completedVideosCount -= 1;
    return await this.save();
  }
  return this;
};

const User = mongoose.model("User", UserSchema);

export default User;