import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import curriculumRoutes from './routes/curriculumRoutes.js';
import dotenv from 'dotenv';
import connectDB from "./config/db.js";

// Connect to MongoDB
connectDB();


const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api', curriculumRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
//     .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
//     .catch(err => console.error(err));