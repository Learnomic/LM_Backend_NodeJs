// models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: {
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
    required: true,
  },
  board: {
    type: String,
    enum: ["State", "CBSE", "ICSE"],
    required: true,
  },
  grade: {
    type: Number,
    required: true,
  },
});

const User=mongoose.model("User", UserSchema);
export default User ;