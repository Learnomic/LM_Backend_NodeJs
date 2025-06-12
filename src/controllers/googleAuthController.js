import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import { verifyGoogleToken } from '../config/googleAuth.js';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Google Sign In
export const googleSignIn = async (req, res) => {
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
        const { email, name, picture } = payload;

        // Check if user exists
        let user = await User.findOne({ email });

        if (!user) {
            // Create new user if doesn't exist
            user = await User.create({
                name,
                email,
                profilePicture: picture,
                isGoogleUser: true,
                isVerified: true // Google accounts are pre-verified
            });
        }

        // Generate JWT token
        const authToken = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture,
                isGoogleUser: user.isGoogleUser
            },
            token: authToken
        });

    } catch (error) {
        console.error('Google Sign In Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error during Google sign in',
            error: error.message 
        });
    }
}; 