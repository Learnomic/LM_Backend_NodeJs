import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import curriculumRoutes from './routes/curriculumRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import userRoutes from './routes/userRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { submitQuiz } from './controllers/quizController.js';
import protect from './middleware/authMiddleware.js';
import connectDB from './config/db.js';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log('Incoming request:', {
        method: req.method,
        url: req.url,
        path: req.path,
        originalUrl: req.originalUrl
    });
    next();
});

// Mount routes
console.log('Mounting routes...');
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/curriculum', curriculumRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/user', userRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Add submit_quiz route at root level
app.post('/api/submit_quiz', protect, submitQuiz);

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Learning Management System API' });
});

// 404 handler
app.use((req, res) => {
    console.log('404 Not Found:', {
        method: req.method,
        url: req.url,
        path: req.path,
        originalUrl: req.originalUrl
    });
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.url}`
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 