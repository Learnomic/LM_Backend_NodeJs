import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import curriculumRoutes from './src/routes/curriculumRoutes.js';
import connectDB from "./src/config/db.js";
import authRoutes from './src/routes/authRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
import leaderboardRoutes from './src/routes/leaderboardRoutes.js';
import questionPaperRoute from './src/routes/QuestPaperRoute.js';
import quizRoutes from './src/routes/quizRoutes.js';
// import googleAuthRoutes from './src/routes/googleAuthRoutes.js';

// Connect to MongoDB
connectDB();

const app = express();
app.use((req, res, next) => {
  console.log(`Incoming ${req.method} request to: ${req.path}`);
  next();
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
// app.use('/api/googleauth', googleAuthRoutes);
app.use('/api/curriculum', curriculumRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/videos', curriculumRoutes);
app.use('/api/question-paper', questionPaperRoute);

app.use('/api/quiz', (req, res, next) => {
  console.log(`Quiz route accessed: ${req.method} ${req.originalUrl}`);
  next();
}, quizRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get('/api/test', (req, res) => {
  res.send('API is working');
});

// mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
//     .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
//     .catch(err => console.error(err));

export default app;
