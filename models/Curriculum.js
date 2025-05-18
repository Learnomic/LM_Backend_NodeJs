import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
    videoUrl: String
}, { _id: true });

const subtopicSchema = new mongoose.Schema({
    name: String,
    videos: [videoSchema]
}, { _id: true });

const topicSchema = new mongoose.Schema({
    name: String,
    subtopics: [subtopicSchema]
}, { _id: true });

const chapterSchema = new mongoose.Schema({
    name: String,
    topics: [topicSchema]
}, { _id: true });

const curriculumSchema = new mongoose.Schema({
    board: String,
    grade: String,
    name: String,
    chapters: [chapterSchema]
});

export default mongoose.model('Curriculum', curriculumSchema);