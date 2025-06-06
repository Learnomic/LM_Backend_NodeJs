import User from '../models/userModel.js';
import jwt from 'jsonwebtoken';

// Controller for initiating Google login
export const initiateGoogleLogin = (req, res) => {
    console.log('🚀 Initiating Google login process');
    res.json({
        success: true,
        message: 'Redirect to Google OAuth',
        url: '/api/auth/google'
    });
};

// Controller for handling Google login success
export const handleGoogleLoginSuccess = async (req, res) => {
    console.log('✅ Google login successful');
    try {
        const { token } = req.user;
        console.log('🔑 Token generated for user:', req.user.user._id);
        
        res.json({
            success: true,
            message: 'Google login successful',
            token,
            user: req.user.user
        });
    } catch (error) {
        console.error('❌ Error during Google login:', error);
        res.status(500).json({
            success: false,
            message: 'Error during Google login',
            error: error.message
        });
    }
};

// Controller for handling Google login failure
export const handleGoogleLoginFailure = (req, res) => {
    console.log('❌ Google login failed');
    res.status(401).json({
        success: false,
        message: 'Google login failed'
    });
};

// Controller for getting current user profile
export const getCurrentUser = async (req, res) => {
    console.log('🔍 Fetching user profile');
    try {
        const user = await User.findById(req.user.id).select('-password');
        console.log('👤 User found:', user ? 'Yes' : 'No');
        
        if (!user) {
            console.log('❌ User not found');
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('✅ User profile fetched successfully');
        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('❌ Error fetching user profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user profile',
            error: error.message
        });
    }
}; 