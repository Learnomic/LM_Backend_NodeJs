import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import compression from 'compression';
import curriculumRoutes from './src/routes/curriculumRoutes.js';
import connectDB from "./src/config/db.js";
import authRoutes from './src/routes/authRoutes.js';
import QuizRoutes from './src/routes/quizRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
import leaderboardRoutes from './src/routes/leaderboardRoutes.js';

// Connect to MongoDB
connectDB();

const app = express();
const PORT = parseInt(process.env.PORT) || 5000;

// Enable compression for all routes
app.use(compression());

app.use(cors());
app.use(express.json());

// Add cache control headers middleware
app.use((req, res, next) => {
  // Cache static assets for 1 day
  if (req.url.match(/^\/(css|js|img|font)/i)) {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
  // Cache API responses for 5 minutes
  else if (req.url.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'private, max-age=300');
  }
  next();
});

app.use('/api/curriculum', curriculumRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', QuizRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/videos', curriculumRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
//     .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
//     .catch(err => console.error(err));

export default app;