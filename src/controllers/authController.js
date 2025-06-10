// controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js"
import UserCredential from "../models/UserCredential.js"
import nodemailer from 'nodemailer';
import crypto from 'crypto';

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

// Store reset tokens (in production, use Redis or database)
const resetTokens = new Map();

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
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        console.log('Processing forgot password request for:', email);
        console.log('Email configuration:', {
            user: process.env.EMAIL_USER,
            hasPassword: !!process.env.EMAIL_PASSWORD,
            frontendUrl: process.env.FRONTEND_URL
        });

        // Find user by email
        const userCredential = await UserCredential.findOne({ email });
        if (!userCredential) {
            console.log('No user found with email:', email);
            return res.status(404).json({ message: "No account found with this email" });
        }

        console.log('User found, generating reset token');

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = Date.now() + 3600000; // Token valid for 1 hour

        // Store token (in production, store in database)
        resetTokens.set(email, {
            token: resetToken,
            expiry: tokenExpiry
        });

        // Create reset URL
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        console.log('Reset URL generated:', resetUrl);

        // Send email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <h1>Password Reset Request</h1>
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <a href="${resetUrl}">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `
        };

        console.log('Attempting to send email...');
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');

        res.status(200).json({ 
            message: "Password reset email sent successfully",
            note: "Check your email for reset instructions"
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            message: "Error processing password reset request",
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ message: "Token and new password are required" });
        }

        // Find the email associated with this token
        let email = null;
        for (const [storedEmail, tokenData] of resetTokens.entries()) {
            if (tokenData.token === token) {
                email = storedEmail;
                break;
            }
        }

        if (!email) {
            return res.status(400).json({ message: "Invalid or expired reset token" });
        }

        // Check if token is expired
        const tokenData = resetTokens.get(email);
        if (Date.now() > tokenData.expiry) {
            resetTokens.delete(email);
            return res.status(400).json({ message: "Reset token has expired" });
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

        // Remove used token
        resetTokens.delete(email);

        res.status(200).json({ message: "Password has been reset successfully" });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ 
            message: "Error resetting password",
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};
