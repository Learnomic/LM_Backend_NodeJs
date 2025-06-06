import mongoose from 'mongoose';

const chapterSchema = new mongoose.Schema({
    subject: {
        type: String,
        required: true,
        trim: true
    },
    chapterName: {
        type: String,
        required: true,
        trim: true
    }
}, {
    collection: 'Chapters',
    timestamps: true
});

// Add indexes for frequently queried fields
chapterSchema.index({ subject: 1, chapterName: 1 }, { unique: true });
chapterSchema.index({ subject: 1 });

const Chapter = mongoose.model('Chapter', chapterSchema);

export default Chapter; 