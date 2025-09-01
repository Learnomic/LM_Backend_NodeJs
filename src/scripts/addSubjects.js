import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Subject from '../models/Subject.js';

dotenv.config();

const subjects = [
    {
        subject: "Geometry",
        board: "CBSE",
        grade: "10"
    },
    {
        subject: "Algebra",
        board: "CBSE",
        grade: "10"
    },
    {
        subject: "Physics",
        board: "CBSE",
        grade: "10"
    },
    {
        subject: "Chemistry",
        board: "CBSE",
        grade: "10"
    }
];

const addSubjects = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Clear existing subjects
        await Subject.deleteMany({});
        console.log('Cleared existing subjects');

        // Add new subjects
        const addedSubjects = await Subject.insertMany(subjects);
        console.log('Added subjects:', addedSubjects);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

addSubjects(); 