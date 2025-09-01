import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
    subname: { // was 'name'
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
    },
    medium: {
        type: [String],
        required: false,
        default: []
    },
    coverimg: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true,
    collection: 'Subjects'
});

// Index for faster queries by board & grade
subjectSchema.index({ board: 1, grade: 1 });

const Subject = mongoose.models.Subject || mongoose.model('Subject', subjectSchema);
export default Subject;
