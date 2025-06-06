import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/userModel.js';
import jwt from 'jsonwebtoken';

const configureGoogleAuth = () => {
    console.log('🔧 Configuring Google Authentication...');
    console.log('📝 Using callback URL:', `${process.env.BACKEND_URL}/api/auth/google/callback`);

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
        scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
        console.log('🔄 Google OAuth callback received');
        console.log('👤 Google Profile:', {
            id: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName
        });

        try {
            // Check if user already exists
            let user = await User.findOne({ email: profile.emails[0].value });
            console.log('🔍 Existing user check:', user ? 'Found' : 'Not found');

            if (!user) {
                console.log('➕ Creating new user...');
                // Create new user if doesn't exist
                // Add placeholder/default values for required fields not provided by Google
                user = await User.create({
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    googleId: profile.id,
                    isVerified: true,
                    board: 'N/A', // Placeholder
                    grade: 0    // Placeholder
                });
                console.log('✅ New user created:', user._id);
            }

            // Generate JWT token
            console.log('🔑 Generating JWT token...');
            const token = jwt.sign(
                { id: user._id },
                process.env.JWT_SECRET,
                { expiresIn: '30d' }
            );
            console.log('✅ JWT token generated');

            return done(null, { user, token });
        } catch (error) {
            console.error('❌ Error in Google Strategy:', error);
            return done(error, null);
        }
    }));

    passport.serializeUser((user, done) => {
        console.log('📦 Serializing user:', user.user._id);
        done(null, user);
    });

    passport.deserializeUser((user, done) => {
        console.log('📥 Deserializing user:', user.user._id);
        done(null, user);
    });

    console.log('✅ Google Authentication configured successfully');
};

export default configureGoogleAuth; 