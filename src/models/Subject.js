import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
    subject: {
        type: String,
        required: true,
        trim: true
    },
    board: {
        type: String,
        required: true,
        trim: true
    },
    grade: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true,
    collection: 'Subjects' // Collection names start with capital letters
});

// Add index for faster queries
subjectSchema.index({ board: 1, grade: 1 });

// Use the existing model if it exists, otherwise create a new one
const Subject = mongoose.models.Subject || mongoose.model('Subject', subjectSchema);

export default Subject; 