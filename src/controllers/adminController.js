import Subject from '../models/Subject.js';
import Chapter from '../models/Chapter.js';
import Topic from '../models/Topic.js';
import Subtopic from '../models/Subtopic.js';
import Video from '../models/Video.js';
import Quiz from '../models/Quiz.js';
import User from '../models/User.js';
import QuizScore from '../models/QuizScore.js';
import UserCredential from '../models/UserCredential.js';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose'; // Import mongoose for ObjectId

// @desc    Fetch all users
// @route   GET /api/admin/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req, res) => {
    // Add admin role check here
    const users = await User.find({}).select('-password'); // Exclude passwords
    res.json(users);
});

// @desc    Fetch user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
export const getUserById = asyncHandler(async (req, res) => {
    // Add admin role check here
    const user = await User.findById(req.params.id).select('-password'); // Exclude password

    if (user) {
        res.json(user);
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

// @desc    Update user by ID
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
export const updateUser = asyncHandler(async (req, res) => {
    // Add admin role check here
    const user = await User.findById(req.params.id);

    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        // Do not update password here, provide a separate route for password reset/change
        user.board = req.body.board || user.board;
        user.grade = req.body.grade || user.grade;
        user.school = req.body.school || user.school;
        user.div = req.body.div || user.div;
        user.pincode = req.body.pincode || user.pincode;
        // Add other fields if necessary

        const updatedUser = await user.save();
        res.json(updatedUser);
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

// @desc    Delete user by ID
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req, res) => {
    // Add admin role check here
    const user = await User.findById(req.params.id);

    if (user) {
        await user.remove(); // Mongoose v5 or .deleteOne() in Mongoose v6+
        res.json({ message: 'User removed' });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

// @desc    Fetch all subjects
// @route   GET /api/admin/subjects
// @access  Private/Admin
export const getSubjects = asyncHandler(async (req, res) => {
    // Add admin role check here
    const subjects = await Subject.find({});
    res.json(subjects);
});

// @desc    Fetch subject by ID
// @route   GET /api/admin/subjects/:id
// @access  Private/Admin
export const getSubjectById = asyncHandler(async (req, res) => {
    // Add admin role check here
    const subject = await Subject.findById(req.params.id);

    if (subject) {
        res.json(subject);
    } else {
        res.status(404).json({ message: 'Subject not found' });
    }
});

// @desc    Update subject by ID
// @route   PUT /api/admin/subjects/:id
// @access  Private/Admin
export const updateSubject = asyncHandler(async (req, res) => {
    // Add admin role check here
    const subject = await Subject.findById(req.params.id);

    if (subject) {
        subject.subName = req.body.subName || subject.subName;
        subject.Board_ = req.body.Board_ || subject.Board_;
        subject.Grade = req.body.Grade || subject.Grade;
        // Add other fields if necessary

        const updatedSubject = await subject.save();
        res.json(updatedSubject);
    } else {
        res.status(404).json({ message: 'Subject not found' });
    }
});

// @desc    Delete subject by ID
// @route   DELETE /api/admin/subjects/:id
// @access  Private/Admin
export const deleteSubject = asyncHandler(async (req, res) => {
    // Add admin role check here
    const subject = await Subject.findById(req.params.id);

    if (subject) {
        await subject.remove(); // Mongoose v5 or .deleteOne() in Mongoose v6+
        res.json({ message: 'Subject removed' });
    } else {
        res.status(404).json({ message: 'Subject not found' });
    }
});

// @desc    Create a new Subject
// @route   POST /api/admin/subjects
// @access  Private/Admin
export const createSubject = asyncHandler(async (req, res) => {
    // Add admin role check here
    const { subName, Board_, Grade } = req.body;

    const subject = new Subject({
        subName,
        Board_,
        Grade
    });

    const createdSubject = await subject.save();
    res.status(201).json(createdSubject);
});

// @desc    Create a new Chapter
// @route   POST /api/admin/chapters
// @access  Private/Admin
export const createChapter = asyncHandler(async (req, res) => {
     // Add admin role check here
    const { subjectId, chapter_name } = req.body;

    const chapter = new Chapter({
        subjectId,
        chapter_name
    });

    const createdChapter = await chapter.save();
    res.status(201).json(createdChapter);
});

// @desc    Create a new Topic
// @route   POST /api/admin/topics
// @access  Private/Admin
export const createTopic = asyncHandler(async (req, res) => {
     // Add admin role check here
    const { subjectId, chapterId, topic_name } = req.body;

    const topic = new Topic({
        subjectId,
        chapterId,
        topic_name
    });

    const createdTopic = await topic.save();
    res.status(201).json(createdTopic);
});

// @desc    Create a new Subtopic
// @route   POST /api/admin/subtopics
// @access  Private/Admin
export const createSubtopic = asyncHandler(async (req, res) => {
     // Add admin role check here
    const { subjectId, chapterId, topicId, subtopic_name } = req.body;

    const subtopic = new Subtopic({
        subjectId,
        chapterId,
        topicId,
        subtopic_name
    });

    const createdSubtopic = await subtopic.save();
    res.status(201).json(createdSubtopic);
});

// @desc    Create a new Video
// @route   POST /api/admin/videos
// @access  Private/Admin
export const createVideo = asyncHandler(async (req, res) => {
     // Add admin role check here
    const { subjectId, chapterId, topicId, subtopicId, video_url } = req.body;

    const video = new Video({
        subjectId,
        chapterId,
        topicId,
        subtopicId,
        video_url
    });

    const createdVideo = await video.save();
    res.status(201).json(createdVideo);
});

// @desc    Create a new Quiz
// @route   POST /api/admin/quizzes
// @access  Private/Admin
export const createQuiz = asyncHandler(async (req, res) => {
     // Add admin role check here
    const { videoId, videoUrl, questions } = req.body;

    const quiz = new Quiz({
        videoId,
        videoUrl,
        questions
    });

    const createdQuiz = await quiz.save();
    res.status(201).json(createdQuiz);
});

// @desc    Fetch all chapters
// @route   GET /api/admin/chapters
// @access  Private/Admin
export const getChapters = asyncHandler(async (req, res) => {
    // Add admin role check here
    const chapters = await Chapter.find({}).populate('subjectId', 'subName'); // Populate subject name
    res.json(chapters);
});

// @desc    Fetch chapter by ID
// @route   GET /api/admin/chapters/:id
// @access  Private/Admin
export const getChapterById = asyncHandler(async (req, res) => {
    // Add admin role check here
    const chapter = await Chapter.findById(req.params.id).populate('subjectId', 'subName'); // Populate subject name

    if (chapter) {
        res.json(chapter);
    } else {
        res.status(404).json({ message: 'Chapter not found' });
    }
});

// @desc    Update chapter by ID
// @route   PUT /api/admin/chapters/:id
// @access  Private/Admin
export const updateChapter = asyncHandler(async (req, res) => {
    // Add admin role check here
    const chapter = await Chapter.findById(req.params.id);

    if (chapter) {
        chapter.subjectId = req.body.subjectId || chapter.subjectId;
        chapter.chapter_name = req.body.chapter_name || chapter.chapter_name;
        // Add other fields if necessary

        const updatedChapter = await chapter.save();
        res.json(updatedChapter);
    } else {
        res.status(404).json({ message: 'Chapter not found' });
    }
});

// @desc    Delete chapter by ID
// @route   DELETE /api/admin/chapters/:id
// @access  Private/Admin
export const deleteChapter = asyncHandler(async (req, res) => {
    // Add admin role check here
    const chapter = await Chapter.findById(req.params.id);

    if (chapter) {
        await chapter.remove(); // Mongoose v5 or .deleteOne() in Mongoose v6+
        res.json({ message: 'Chapter removed' });
    } else {
        res.status(404).json({ message: 'Chapter not found' });
    }
});

// @desc    Fetch all topics
// @route   GET /api/admin/topics
// @access  Private/Admin
export const getTopics = asyncHandler(async (req, res) => {
    // Add admin role check here
    const topics = await Topic.find({})
        .populate('subjectId', 'subName')
        .populate('chapterId', 'chapter_name'); // Populate related names
    res.json(topics);
});

// @desc    Fetch topic by ID
// @route   GET /api/admin/topics/:id
// @access  Private/Admin
export const getTopicById = asyncHandler(async (req, res) => {
    // Add admin role check here
    const topic = await Topic.findById(req.params.id)
        .populate('subjectId', 'subName')
        .populate('chapterId', 'chapter_name'); // Populate related names

    if (topic) {
        res.json(topic);
    } else {
        res.status(404).json({ message: 'Topic not found' });
    }
});

// @desc    Update topic by ID
// @route   PUT /api/admin/topics/:id
// @access  Private/Admin
export const updateTopic = asyncHandler(async (req, res) => {
    // Add admin role check here
    const topic = await Topic.findById(req.params.id);

    if (topic) {
        topic.subjectId = req.body.subjectId || topic.subjectId;
        topic.chapterId = req.body.chapterId || topic.chapterId;
        topic.topic_name = req.body.topic_name || topic.topic_name;
        // Add other fields if necessary

        const updatedTopic = await topic.save();
        res.json(updatedTopic);
    } else {
        res.status(404).json({ message: 'Topic not found' });
    }
});

// @desc    Delete topic by ID
// @route   DELETE /api/admin/topics/:id
// @access  Private/Admin
export const deleteTopic = asyncHandler(async (req, res) => {
    // Add admin role check here
    const topic = await Topic.findById(req.params.id);

    if (topic) {
        await topic.remove(); // Mongoose v5 or .deleteOne() in Mongoose v6+
        res.json({ message: 'Topic removed' });
    } else {
        res.status(404).json({ message: 'Topic not found' });
    }
});

// @desc    Fetch all subtopics
// @route   GET /api/admin/subtopics
// @access  Private/Admin
export const getSubtopics = asyncHandler(async (req, res) => {
    // Add admin role check here
    const subtopics = await Subtopic.find({})
        .populate('subjectId', 'subName')
        .populate('chapterId', 'chapter_name')
        .populate('topicId', 'topic_name'); // Populate related names
    res.json(subtopics);
});

// @desc    Fetch subtopic by ID
// @route   GET /api/admin/subtopics/:id
// @access  Private/Admin
export const getSubtopicById = asyncHandler(async (req, res) => {
    // Add admin role check here
    const subtopic = await Subtopic.findById(req.params.id)
        .populate('subjectId', 'subName')
        .populate('chapterId', 'chapter_name')
        .populate('topicId', 'topic_name'); // Populate related names

    if (subtopic) {
        res.json(subtopic);
    } else {
        res.status(404).json({ message: 'Subtopic not found' });
    }
});

// @desc    Update subtopic by ID
// @route   PUT /api/admin/subtopics/:id
// @access  Private/Admin
export const updateSubtopic = asyncHandler(async (req, res) => {
    // Add admin role check here
    const subtopic = await Subtopic.findById(req.params.id);

    if (subtopic) {
        subtopic.subjectId = req.body.subjectId || subtopic.subjectId;
        subtopic.chapterId = req.body.chapterId || subtopic.chapterId;
        subtopic.topicId = req.body.topicId || subtopic.topicId;
        subtopic.subtopic_name = req.body.subtopic_name || subtopic.subtopic_name;
        // Add other fields if necessary

        const updatedSubtopic = await subtopic.save();
        res.json(updatedSubtopic);
    } else {
        res.status(404).json({ message: 'Subtopic not found' });
    }
});

// @desc    Delete subtopic by ID
// @route   DELETE /api/admin/subtopics/:id
// @access  Private/Admin
export const deleteSubtopic = asyncHandler(async (req, res) => {
    // Add admin role check here
    const subtopic = await Subtopic.findById(req.params.id);

    if (subtopic) {
        await subtopic.remove(); // Mongoose v5 or .deleteOne() in Mongoose v6+
        res.json({ message: 'Subtopic removed' });
    } else {
        res.status(404).json({ message: 'Subtopic not found' });
    }
}); 