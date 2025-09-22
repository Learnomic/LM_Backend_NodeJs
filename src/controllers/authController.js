// controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { generateOTP } from '../utils/otpGenerator.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Store reset tokens (in production, use Redis or database)
const resetTokens = new Map();

export const register = async (req, res) => {
  const { name, email, password, board, grade } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Required fields are missing." });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists." });
    }

    // Create new user
    const newUser = await User.create({
      name,
      email,
      password, // Will be hashed by pre-save middleware
      board,
      grade,
      isGoogleUser: false,
      isVerified: false
    });

    console.log('Created User:', newUser._id);

    // Generate token using the User's ID
    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: "7d" });

    // Return user data (password excluded by select: false)
    res.status(201).json({ 
      token, 
      user: {
        _id: newUser._id,
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

    // Find user by email and include password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(400).json({
        message: "Invalid email or password"
      });
    }

    // Check if it's a Google user trying to login with password
    if (user.isGoogleUser) {
      return res.status(400).json({
        message: "Please use Google Sign-In for this account"
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      console.log('Invalid password for email:', email);
      return res.status(400).json({
        message: "Invalid email or password"
      });
    }

    // Generate token using the User's ID
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log('Login successful for user:', user.email);

    // Send response with User details (password excluded by default)
    res.status(200).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        board: user.board,
        grade: user.grade,
        profilePicture: user.profilePicture
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
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; // From auth middleware

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    // Find user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if it's a Google user
    if (user.isGoogleUser) {
      return res.status(400).json({ message: "Google users cannot change password" });
    }

    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Update password (will be hashed by pre-save middleware)
    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      message: "Server error during password change",
      error: error.message
    });
  }
};

export const forgetPassword = async (req, res) => {
    try {
        console.log('Forget password request received:', req.body);
        
        const { email } = req.body;
        if (!email) {
            console.log('Email missing in request');
            return res.status(400).json({ message: "Email is required" });
        }

        console.log('Looking for user with email:', email);
        const user = await User.findOne({ email });
        
        if (!user) {
            console.log('User not found');
            return res.status(404).json({ message: "No account found with this email" });
        }

        if (user.isGoogleUser) {
            console.log('Google user attempted password reset');
            return res.status(400).json({ 
                message: "Google users cannot reset password. Please use Google Sign-In." 
            });
        }

        const otp = generateOTP();
        const otpExpiry = Date.now() + 600000;
        
        console.log('Generated OTP:', otp);
        
        user.resetPasswordOTP = otp;
        user.resetPasswordOTPExpiry = otpExpiry;
        await user.save();
        console.log('OTP saved to user document');

        const mailOptions = {
            from: `Learnomic <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Password Reset OTP',
            html: `OTP: ${otp}`
        };

        console.log('Attempting to send email...');
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');

        res.status(200).json({ 
            message: "OTP sent to your email successfully",
            note: "Check your email for the OTP"
        });

    } catch (error) {
        console.error('Full error in forgetPassword:', error);
        res.status(500).json({ 
            message: "Error processing password reset request",
            error: error.message // Include full error message
        });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ 
                message: "Email, OTP and new password are required" 
            });
        }

        // Find user
        const user = await User.findOne({ email }).select('+resetPasswordOTP +resetPasswordOTPExpiry');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if it's a Google user
        if (user.isGoogleUser) {
            return res.status(400).json({ 
                message: "Google users cannot reset password" 
            });
        }

        // 🔍 Debug logs
        console.log("OTP from frontend:", otp);
        console.log("OTP stored in DB:", user.resetPasswordOTP);

        // ✅ Compare as strings to avoid type mismatch
        if (String(user.resetPasswordOTP) !== String(otp)) {
            return res.status(400).json({ 
                message: "Invalid OTP" 
            });
        }

        // Check if OTP is expired
        if (Date.now() > user.resetPasswordOTPExpiry) {
            return res.status(400).json({ 
                message: "OTP has expired" 
            });
        }

        // Update password (will be hashed by pre-save middleware)
        user.password = newPassword;
        user.resetPasswordOTP = undefined;
        user.resetPasswordOTPExpiry = undefined;
        await user.save();

        res.status(200).json({ 
            message: "Password has been reset successfully" 
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ 
            message: "Error resetting password",
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};