import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// Google Sign In
export const googleSignIn = asyncHandler(async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ 
                success: false, 
                message: 'Google token is required' 
            });
        }

        // Verify the Google token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId } = payload;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email not provided by Google'
            });
        }

        // Check if user exists by email or googleId
        let user = await User.findOne({ 
            $or: [
                { email: email },
                { googleId: googleId }
            ]
        });

        if (!user) {
            // Create new Google user
            user = new User({
                name: name || 'Google User',
                email: email,
                profilePicture: picture || '',
                googleId: googleId,
                isGoogleUser: true,
                isVerified: true // Google accounts are pre-verified
            });
            
            await user.save();
            console.log(`New Google user created in learnomic.Users: ${email}`);
        } else {
            // Update existing user to link Google account if not already linked
            let userUpdated = false;
            
            if (!user.isGoogleUser) {
                user.isGoogleUser = true;
                userUpdated = true;
            }
            
            if (!user.googleId) {
                user.googleId = googleId;
                userUpdated = true;
            }
            
            if (!user.isVerified) {
                user.isVerified = true;
                userUpdated = true;
            }
            
            if (!user.profilePicture && picture) {
                user.profilePicture = picture;
                userUpdated = true;
            }
            
            if (userUpdated) {
                await user.save();
                console.log(`Existing user updated with Google info in learnomic.Users: ${email}`);
            }
        }

        // Generate JWT token
        const authToken = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Google sign in successful',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture,
                isGoogleUser: user.isGoogleUser,
                isVerified: user.isVerified
            },
            token: authToken
        });

    } catch (error) {
        console.error('Google Sign In Error:', error);
        
        // Handle specific Google token errors
        if (error.message.includes('Token used too early') || 
            error.message.includes('Invalid token signature')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid Google token' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Error during Google sign in',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Regular Sign In
export const signIn = asyncHandler(async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        if (user.isGoogleUser && !user.password) {
            return res.status(400).json({
                success: false,
                message: 'This account uses Google Sign-In. Please sign in with Google.'
            });
        }

        const isPasswordMatch = await user.matchPassword(password);

        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Sign in successful',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture,
                isGoogleUser: user.isGoogleUser,
                isVerified: user.isVerified
            },
            token: generateToken(user._id)
        });

    } catch (error) {
        console.error('Sign In Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during sign in',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});
