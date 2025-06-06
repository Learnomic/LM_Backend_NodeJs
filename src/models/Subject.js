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

// Add indexes for frequently queried fields
subjectSchema.index({ subject: 1 }, { unique: true });
subjectSchema.index({ board: 1, grade: 1 });
subjectSchema.index({ subject: 1, board: 1, grade: 1 });

// Use the existing model if it exists, otherwise create a new one
const Subject = mongoose.models.Subject || mongoose.model('Subject', subjectSchema);

export default Subject; 