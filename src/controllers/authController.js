// controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js"
import UserCredential from "../models/UserCredential.js"

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export const register = async (req, res) => {
  const { name, email, password, board, grade } = req.body;

  if (!name || !email || !password || !board || !grade) {
    return res.status(400).json({ message: "Required fields are missing." });
  }

  try {
    // Check if email already exists in UserCredentials
    const existingUserCredential = await UserCredential.findOne({ email });
    if (existingUserCredential)
      return res.status(409).json({ message: "Email already exists." });

    // Create UserCredential
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserCredential = await UserCredential.create({
      email,
      password: hashedPassword,
    });

    // Create User, linking to UserCredential
    const newUser = await User.create({
      name,
      email,
      board,
      grade,
      credential_id: newUserCredential._id, // Link to the created UserCredential
    });

    // Generate token using the User's ID
    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({ 
      token, 
      user: { 
        _id: newUser._id, // Include user ID in response
        name: newUser.name, 
        email: newUser.email, 
        board: newUser.board, 
        grade: newUser.grade 
      } 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide both email and password"
      });
    }

    console.log('Attempting login for email:', email);

    // Find user credentials first
    const userCredential = await UserCredential.findOne({ email });
    if (!userCredential) {
      console.log('User credential not found for email:', email);
      return res.status(400).json({
        message: "Invalid email or password" // Use a generic message for security
      });
    }

    // Check password against the hashed password in UserCredential
    const isMatch = await bcrypt.compare(password, userCredential.password);
    if (!isMatch) {
      console.log('Invalid password for email:', email);
      return res.status(400).json({
        message: "Invalid email or password" // Use a generic message for security
      });
    }

    // Find the corresponding User document using credential_id
    const user = await User.findOne({ credential_id: userCredential._id }).select('-password'); // Exclude password from the User object

    if (!user) {
         console.log('User document not found for credential_id:', userCredential._id);
         return res.status(404).json({ message: 'User profile not found' });
    }

    // Generate token using the User's ID
    console.log('JWT_SECRET value before signing:', process.env.JWT_SECRET);
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log('Login successful for user:', user.email);

    // Send response with User details
    res.status(200).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        board: user.board,
        grade: user.grade
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: "Server error during login",
      error: error.message
    });
  }
};

export const changePassword = async (req, res) => {
  // Implementation for changing password
  res.status(501).json({ message: "Change password not implemented" });
};

export const forgetPassword = async (req, res) => {
  // Implementation for forgetting password (e.g., sending reset email)
  res.status(501).json({ message: "Forget password not implemented" });
};
