import mongoose from 'mongoose';

const subjectProgressSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        subject: {
            type: String,
            required: true,
        },
        progress: {
            type: Number,
            required: true,
            default: 0, // Progress percentage (0-100)
        },
        lastUpdated: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

const SubjectProgress = mongoose.model('SubjectProgress', subjectProgressSchema);

export default SubjectProgress;
