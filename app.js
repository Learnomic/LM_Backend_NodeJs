import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import curriculumRoutes from './src/routes/curriculumRoutes.js';
import connectDB from "./src/config/db.js";
import authRoutes from './src/routes/authRoutes.js';
import QuizRoutes from './src/routes/quizRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
import leaderboardRoutes from './src/routes/leaderboardRoutes.js';
import googleAuthRoutes from './src/routes/googleAuthRoutes.js';
import configureGoogleAuth from './src/config/googleAuth.js';
import { initializeIndexes } from './src/controllers/curriculumController.js';
import { submitQuiz } from './src/controllers/quizController.js';
import protect from './src/middleware/authMiddleware.js';
import { submitQuizValidation } from './src/middleware/submitQuizValidation.js';

// Connect to MongoDB
connectDB().then(() => {
    // Initialize indexes after successful connection
    initializeIndexes();
});

const app = express();
const PORT = parseInt(process.env.PORT) || 5000;

// Initialize Passport
app.use(passport.initialize());
configureGoogleAuth();

// Security middleware
app.use(helmet());

// Enable compression for all routes with better options
app.use(compression({
    level: 6, // Higher compression level
    threshold: 100 * 1000, // Compress responses larger than 100kb
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
}));

// Body parser middleware with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add cache control headers middleware with better caching strategy
app.use((req, res, next) => {
    // Cache static assets for 1 week
    if (req.url.match(/^\/(css|js|img|font)/i)) {
        res.setHeader('Cache-Control', 'public, max-age=604800');
    }
    // Cache API responses for different durations based on endpoint
    else if (req.url.startsWith('/api/')) {
        if (req.url.includes('/quiz') || req.url.includes('/curriculum')) {
            res.setHeader('Cache-Control', 'private, max-age=300'); // 5 minutes for quiz and curriculum
        } else if (req.url.includes('/dashboard') || req.url.includes('/leaderboard')) {
            res.setHeader('Cache-Control', 'private, max-age=60'); // 1 minute for dashboard and leaderboard
        } else {
            res.setHeader('Cache-Control', 'private, max-age=30'); // 30 seconds for other API endpoints
        }
    }
    next();
});

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Routes
app.use('/api/curriculum', curriculumRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/quiz', QuizRoutes);
app.post('/api/submit_quiz', protect, submitQuizValidation, submitQuiz);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/videos', curriculumRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
//     .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
//     .catch(err => console.error(err));

export default app;