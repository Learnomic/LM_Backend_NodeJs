import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import curriculumRoutes from './src/routes/curriculumRoutes.js';
import dotenv from 'dotenv';
import connectDB from "./src/config/db.js";
import authRoutes from './src/routes/authRoutes.js';
import QuizRoutes from './src/routes/quizRoutes.js';


// Connect to MongoDB
connectDB();


const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api', curriculumRoutes);
app.use('/api/auth', authRoutes);
app.use('/api',QuizRoutes);
// app.use('/api', dashboardRoutes)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
//     .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
//     .catch(err => console.error(err));