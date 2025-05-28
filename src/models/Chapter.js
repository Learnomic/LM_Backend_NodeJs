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

const Chapter = mongoose.model('Chapter', chapterSchema);

export default Chapter; 