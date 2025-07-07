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
  type: [String], // Array of strings
  required: false,
  default: []
}
}, {
    collection: 'Chapters',
    timestamps: true
});

const Chapter = mongoose.model('Chapter', chapterSchema);

export default Chapter; 
