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

const optimizeGoogleProfilePicture = (originalUrl) => {
    if (!originalUrl) return null;
    
    // If it's a Google profile picture URL
    if (originalUrl.includes('googleusercontent.com')) {
        try {
            // Remove size parameter and add a more reliable one
            const baseUrl = originalUrl.split('=')[0];
            return `${baseUrl}=s96-c-rw`; // rw = read-write, more reliable
        } catch (error) {
            console.log('Error optimizing Google profile picture URL:', error);
            return originalUrl;
        }
    }
    
    return originalUrl;
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

        // Optimize the profile picture URL
        const optimizedPicture = optimizeGoogleProfilePicture(picture);

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
                profilePicture: optimizedPicture || '',
                googleId: googleId,
                isGoogleUser: true,
                isVerified: true // Google accounts are pre-verified
            });
            
            await user.save();
            console.log(`New Google user created: ${email}`);
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
            
            // Update profile picture if it's different or if user doesn't have one
            if (optimizedPicture && (!user.profilePicture || user.profilePicture !== optimizedPicture)) {
                user.profilePicture = optimizedPicture;
                userUpdated = true;
            }
            
            if (userUpdated) {
                await user.save();
                console.log(`Existing user updated with Google info: ${email}`);
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
                isVerified: user.isVerified,
                board: user.board,
                grade: user.grade
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


// Optional: Add a function to refresh profile pictures for existing users
export const refreshProfilePicture = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // If user has a Google profile picture, try to refresh it
        if (user.isGoogleUser && user.profilePicture) {
            const optimizedPicture = optimizeGoogleProfilePicture(user.profilePicture);
            if (optimizedPicture !== user.profilePicture) {
                user.profilePicture = optimizedPicture;
                await user.save();
            }
        }

        res.status(200).json({
            success: true,
            message: 'Profile picture refreshed',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture,
                isGoogleUser: user.isGoogleUser,
                isVerified: user.isVerified,
                board: user.board,
                grade: user.grade
            }
        });

    } catch (error) {
        console.error('Refresh Profile Picture Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error refreshing profile picture',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Regular Sign In
// export const signIn = asyncHandler(async (req, res) => {
//     try {
//         const { email, password } = req.body;

//         if (!email || !password) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Email and password are required'
//             });
//         }

//         const user = await User.findOne({ email });

//         if (!user) {
//             return res.status(401).json({
//                 success: false,
//                 message: 'Invalid email or password'
//             });
//         }

//         if (user.isGoogleUser && !user.password) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'This account uses Google Sign-In. Please sign in with Google.'
//             });
//         }

//         const isPasswordMatch = await user.matchPassword(password);

//         if (!isPasswordMatch) {
//             return res.status(401).json({
//                 success: false,
//                 message: 'Invalid email or password'
//             });
//         }

//         res.status(200).json({
//             success: true,
//             message: 'Sign in successful',
//             user: {
//                 _id: user._id,
//                 name: user.name,
//                 email: user.email,
//                 profilePicture: user.profilePicture,
//                 isGoogleUser: user.isGoogleUser,
//                 isVerified: user.isVerified,
//                 board: user.board,
//                 grade: user.grade
//             },
//             token: generateToken(user._id)
//         });

//     } catch (error) {
//         console.error('Sign In Error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error during sign in',
//             error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
//         });
//     }
// });

// Complete Google User Profile (for users who need to add board/grade)
// export const completeGoogleProfile = asyncHandler(async (req, res) => {
//     try {
//         const { board, grade, school, div, pincode } = req.body;
//         const userId = req.user._id; // Assuming you have auth middleware

//         if (!board || !grade) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Board and grade are required'
//             });
//         }

//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'User not found'
//             });
//         }

//         user.board = board;
//         user.grade = grade;
//         if (school) user.school = school;
//         if (div) user.div = div;
//         if (pincode) user.pincode = pincode;

//         await user.save();

//         res.status(200).json({
//             success: true,
//             message: 'Profile completed successfully',
//             user: {
//                 _id: user._id,
//                 name: user.name,
//                 email: user.email,
//                 profilePicture: user.profilePicture,
//                 isGoogleUser: user.isGoogleUser,
//                 isVerified: user.isVerified,
//                 board: user.board,
//                 grade: user.grade,
//                 school: user.school,
//                 div: user.div,
//                 pincode: user.pincode
//             }
//         });

//     } catch (error) {
//         console.error('Complete Profile Error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error completing profile',
//             error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
//         });
//     }
// });