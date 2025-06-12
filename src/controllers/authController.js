// controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js"
import UserCredential from "../models/UserCredential.js"
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import ResetToken from '../models/ResetToken.js';
import OTP from '../models/OTP.js';

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

// Verify transporter configuration
transporter.verify(function(error, success) {
    if (error) {
        console.log('Email configuration error:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

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
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user._id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current password and new password are required" });
        }

        // Find user and their credentials
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const userCredential = await UserCredential.findById(user.credential_id);
        if (!userCredential) {
            return res.status(404).json({ message: "User credentials not found" });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, userCredential.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        userCredential.password = hashedPassword;
        await userCredential.save();

        res.status(200).json({ message: "Password changed successfully" });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ 
            message: "Error changing password",
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

export const verifyResetToken = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Token is required"
            });
        }

        // Find the token in database
        const resetToken = await ResetToken.findOne({ token });
        if (!resetToken) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset token"
            });
        }

        res.status(200).json({
            success: true,
            message: "Token is valid",
            email: resetToken.email
        });

    } catch (error) {
        console.error('Verify token error:', error);
        res.status(500).json({
            success: false,
            message: "Error verifying token",
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

export const forgetPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        console.log('Processing forgot password request for:', email);

        // Find user by email
        const userCredential = await UserCredential.findOne({ email });
        if (!userCredential) {
            // Don't reveal that the email doesn't exist for security
            return res.status(200).json({ 
                message: "If your email is registered, you will receive a password reset OTP"
            });
        }

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP to database
        await OTP.findOneAndUpdate(
            { email },
            { email, otp },
            { upsert: true, new: true }
        );

        // Send OTP email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset OTP',
            html: `
                <h1>Password Reset Request</h1>
                <p>Your OTP for password reset is: <strong>${otp}</strong></p>
                <p>This OTP will expire in 5 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ 
            message: "If your email is registered, you will receive a password reset OTP"
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ 
            message: "Error processing forgot password request",
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                message: "Email, OTP, and new password are required"
            });
        }

        console.log('Attempting to reset password for email:', email);
        console.log('Provided OTP:', otp);

        // Find the OTP in database
        const otpRecord = await OTP.findOne({ email, otp });
        console.log('Found OTP record:', otpRecord);

        if (!otpRecord) {
            // Let's check if there's any OTP for this email
            const anyOtpForEmail = await OTP.findOne({ email });
            console.log('Any OTP found for this email:', anyOtpForEmail);
            
            return res.status(400).json({
                message: "Invalid or expired OTP"
            });
        }

        // Find user credentials
        const userCredential = await UserCredential.findOne({ email });
        if (!userCredential) {
            return res.status(404).json({ message: "User not found" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        userCredential.password = hashedPassword;
        await userCredential.save();

        // Delete the used OTP
        await OTP.deleteOne({ _id: otpRecord._id });

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
