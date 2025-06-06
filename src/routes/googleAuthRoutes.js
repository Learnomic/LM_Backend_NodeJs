import express from 'express';
import passport from 'passport';
import { 
    initiateGoogleLogin, 
    handleGoogleLoginSuccess, 
    handleGoogleLoginFailure,
    getCurrentUser 
} from '../controllers/googleAuthController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// Route to initiate Google OAuth
router.get('/google', (req, res, next) => {
    console.log('🚀 Initiating Google OAuth...');
    console.log('📤 Request from:', req.headers.origin);
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// Google OAuth callback route
router.get('/google/callback',
    (req, res, next) => {
        console.log('🔄 Google OAuth callback received');
        console.log('📥 Query parameters:', req.query);
        passport.authenticate('google', { 
            session: false,
            failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`
        })(req, res, next);
    },
    (req, res) => {
        console.log('✅ Google authentication successful');
        console.log('👤 User authenticated:', req.user.user._id);
        // Redirect to frontend with token
        res.redirect(`${process.env.FRONTEND_URL}/auth/google-success?token=${req.user.token}`);
    }
);

// Google login failure route
router.get('/google/failure', (req, res) => {
    console.log('❌ Google authentication failed');
    console.log('📤 Sending failure response');
    handleGoogleLoginFailure(req, res);
});

// Get current user profile (protected route)
router.get('/profile', protect, async (req, res) => {
    console.log('🔍 Fetching user profile');
    console.log('👤 User ID:', req.user.id);
    try {
        await getCurrentUser(req, res);
    } catch (error) {
        console.error('❌ Error fetching profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user profile',
            error: error.message
        });
    }
});

// Initiate Google login (API endpoint)
router.post('/google/login', (req, res) => {
    console.log('📥 Google login request received');
    console.log('📤 Request from:', req.headers.origin);
    initiateGoogleLogin(req, res);
});

export default router; 