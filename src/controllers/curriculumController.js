import Subject from '../models/Subject.js';
import Chapter from '../models/Chapter.js';
import Topic from '../models/Topic.js';
import Subtopic from '../models/Subtopic.js';
import Video from '../models/Video.js';
import Quiz from '../models/Quiz.js';
import asyncHandler from 'express-async-handler';
// import Result from '../models/Result.js'; // Assuming QuizScore replaces Result
// import Curriculum from '../models/Curriculum.js'; // Old model

// @desc    Get complete curriculum content for user's board and grade
// @route   GET /api/content
// @access  Private (assuming content is protected)
export const getCompleteContent = asyncHandler(async (req, res) => {
    try {
        // Get board and grade from authenticated user
        const { board, grade } = req.user;

        // Find the subject for the user's board and grade
        const subject = await Subject.findOne({ board: board, grade: grade });

        if (!subject) {
            return res.status(404).json({ message: 'Subject not found for this board and grade' });
        }

        const subjectId = subject._id;

        // Fetch all chapters for this subject
        const chapters = await Chapter.find({ subject: subject.subject }).lean();

        // Iterate through chapters and fetch nested data
        for (const chapter of chapters) {
            // Fetch topics for the current chapter
            chapter.topics = await Topic.find({ 
                subjectId: subjectId,
                chapterId: chapter._id 
            }).lean();

            // Iterate through topics and fetch nested data
            for (const topic of chapter.topics) {
                // Fetch subtopics for the current topic
                topic.subtopics = await Subtopic.find({ 
                    subName: subject.subject,
                    chapterName: chapter.chapterName,
                    topicName: topic.topicName
                }).lean();

                // Iterate through subtopics and fetch nested data
                for (const subtopic of topic.subtopics) {
                    // Fetch videos for the current subtopic
                    subtopic.videos = await Video.find({ 
                        subName: subject.subject,
                        topicName: topic.topicName,
                        chapterName: chapter.chapterName,
                        subtopicName: subtopic.subtopicName
                    }).lean();
                }
            }
        }

        // Structure the response
        const completeContent = {
            _id: subject._id,
            subject: subject.subject,
            board: subject.board,
            grade: subject.grade,
            chapters: chapters
        };

        res.json(completeContent);

    } catch (err) {
        console.error('Error fetching complete curriculum content:', err);
        res.status(500).json({ error: err.message });
    }
});

// @desc    Get all subjects
// @route   GET /api/subjects
// @access  Private
export const getSubjects = asyncHandler(async (req, res) => {
    try {
        console.log('Fetching all subjects');
        const { board, grade } = req.query;
        let query = {};

        if (board) query.board = board;
        if (grade) query.grade = grade;

        console.log('Query for subjects:', query);
        const subjects = await Subject.find(query);
        console.log('Found subjects:', subjects);

        if (subjects.length === 0) {
            return res.status(404).json({ 
                message: 'No subjects found',
                query: query
            });
        }

        res.json(subjects);
    } catch (error) {
        console.error('Error in getSubjects:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get subject by ID
// @route   GET /api/subjects/:id
// @access  Private
export const getSubjectById = asyncHandler(async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id);
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }
        res.json(subject);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get chapters for a specific subject
// @route   GET /api/chapters/:subjectName
// @access  Private
export const getChapters = asyncHandler(async (req, res) => {
    try {
        console.log('Received request for chapters with params:', req.params);
        let query = {};
        
        // If subjectId is provided in params
        if (req.params.subjectId) {
            console.log('Searching for subject:', req.params.subjectId);
            
            // Check if it's a valid ObjectId
            if (req.params.subjectId.match(/^[0-9a-fA-F]{24}$/)) {
                console.log('Subject ID is a valid ObjectId');
                // If it's an ObjectId, find the subject first
                const subject = await Subject.findById(req.params.subjectId);
                console.log('Found subject by ID:', subject);
                if (!subject) {
                    return res.status(404).json({ message: 'Subject not found' });
                }
                query.subject = subject.subject;
            } else {
                console.log('Using subject name directly');
                // If it's a subject name, use it directly
                query.subject = req.params.subjectId;
            }
        }

        console.log('Query for chapters:', query);
        const chapters = await Chapter.find(query);
        console.log('Found chapters:', chapters);
            
        if (chapters.length === 0) {
            return res.status(404).json({ 
                message: 'No chapters found',
                query: query,
                subject: req.params.subjectId
            });
        }

        res.json(chapters);
    } catch (error) {
        console.error('Error in getChapters:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get chapter by ID
// @route   GET /api/chapters/:id
// @access  Private
export const getChapterById = asyncHandler(async (req, res) => {
    try {
        const chapter = await Chapter.findById(req.params.id);
        if (!chapter) {
            return res.status(404).json({ message: 'Chapter not found' });
        }
        res.json(chapter);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get topics for a specific chapter
// @route   GET /api/topics/:chapterId
// @access  Private
export const getTopics = asyncHandler(async (req, res) => {
    try {
        let query = {};
        
        // If chapterId is provided in params, filter by chapter
        if (req.params.chapterId) {
            query.chapterId = req.params.chapterId;
        }

        const topics = await Topic.find(query)
            .populate('subjectId', 'subject board grade')
            .populate('chapterId', 'chapterName');
        res.json(topics);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get topic by ID
// @route   GET /api/topics/:id
// @access  Private
export const getTopicById = asyncHandler(async (req, res) => {
    try {
        const topic = await Topic.findById(req.params.id)
            .populate('subjectId', 'subject board grade')
            .populate('chapterId', 'chapterName');
            
        if (!topic) {
            return res.status(404).json({ message: 'Topic not found' });
        }
        res.json(topic);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get subtopics for a specific topic
// @route   GET /api/subtopics/:topicId
// @access  Private
export const getSubtopics = asyncHandler(async (req, res) => {
    try {
        let query = {};
        
        // If topicId is provided in params, filter by topic
        if (req.params.topicId) {
            query.topicName = req.params.topicId;
        }

        const subtopics = await Subtopic.find(query);
        res.json(subtopics);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get subtopic by ID
// @route   GET /api/subtopics/:id
// @access  Private
export const getSubtopicById = asyncHandler(async (req, res) => {
    try {
        const subtopic = await Subtopic.findById(req.params.id);
        if (!subtopic) {
            return res.status(404).json({ message: 'Subtopic not found' });
        }
        res.json(subtopic);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get videos for a specific subtopic
// @route   GET /api/videos/:subtopicId
// @access  Private
export const getVideos = asyncHandler(async (req, res) => {
    try {
        const videos = await Video.find();
        res.json(videos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get videos by subject
// @route   GET /api/videos/subject/:subjectId
// @access  Private
export const getVideosBySubject = asyncHandler(async (req, res) => {
    try {
        const videos = await Video.find({ subName: req.params.subjectId });
        res.json(videos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get videos by chapter
// @route   GET /api/videos/chapter/:chapterId
// @access  Private
export const getVideosByChapter = asyncHandler(async (req, res) => {
    try {
        const videos = await Video.find({ chapterName: req.params.chapterId });
        res.json(videos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get videos by topic
// @route   GET /api/videos/topic/:topicId
// @access  Private
export const getVideosByTopic = asyncHandler(async (req, res) => {
    try {
        const videos = await Video.find({ topicName: req.params.topicId });
        res.json(videos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get videos by subtopic
// @route   GET /api/videos/subtopic/:subtopicId
// @access  Private
export const getVideosBySubtopic = asyncHandler(async (req, res) => {
    try {
        const videos = await Video.find({ subtopicName: req.params.subtopicId });
        res.json(videos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get video by ID
// @route   GET /api/curriculum/video/:videoId
// @access  Private
export const getVideoById = asyncHandler(async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }
        res.json(video);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get quiz for a specific video
// @route   GET /api/quiz/:videoId
// @access  Private
export const getQuiz = asyncHandler(async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ videoId: req.params.videoId });
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }
        res.json(quiz);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Post new curriculum (admin only)
// @route   POST /api/curriculum
// @access  Private
export const postCurriculum = asyncHandler(async (req, res) => {
    try {
        const { subject, chapter, topic, subtopic, video } = req.body;
        
        // Create subject if it doesn't exist
        let subjectDoc = await Subject.findOne({ subject });
        if (!subjectDoc) {
            subjectDoc = await Subject.create({ subject });
        }

        // Create chapter if it doesn't exist
        let chapterDoc = await Chapter.findOne({ chapterName: chapter });
        if (!chapterDoc) {
            chapterDoc = await Chapter.create({ 
                subject: subjectDoc._id,
                chapterName: chapter 
            });
        }

        // Create topic if it doesn't exist
        let topicDoc = await Topic.findOne({ topicName: topic });
        if (!topicDoc) {
            topicDoc = await Topic.create({
                subjectId: subjectDoc._id,
                chapterId: chapterDoc._id,
                topicName: topic
            });
        }

        // Create subtopic if it doesn't exist
        let subtopicDoc = await Subtopic.findOne({ subtopicName: subtopic });
        if (!subtopicDoc) {
            subtopicDoc = await Subtopic.create({
                subName: subject,
                chapterName: chapter,
                topicName: topic,
                subtopicName: subtopic
            });
        }

        // Create video
        const videoDoc = await Video.create({
            subName: subject,
            topicName: topic,
            chapterName: chapter,
            subtopicName: subtopic,
            videoUrl: video
        });

        res.status(201).json({
            subject: subjectDoc,
            chapter: chapterDoc,
            topic: topicDoc,
            subtopic: subtopicDoc,
            video: videoDoc
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Post new quiz (admin only)
// @route   POST /api/quiz
// @access  Private
export const postQuiz = asyncHandler(async (req, res) => {
    try {
        const { videoId, videoUrl, questions } = req.body;
        const quiz = await Quiz.create({
            videoId,
            videoUrl,
            questions
        });
        res.status(201).json(quiz);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Add video to a subtopic
// @route   POST /api/curriculum/video
// @access  Private/Admin
export const addVideo = asyncHandler(async (req, res) => {
    try {
        const { subName, topicName, chapterName, subtopicName, videoUrl } = req.body;
        const video = await Video.create({
            subName,
            topicName,
            chapterName,
            subtopicName,
            videoUrl
        });
        res.status(201).json(video);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get curriculum by subject name
// @route   GET /api/curriculum/:subjectName
// @access  Public (or Private if needed)
export const getCurriculumBySubjectName = asyncHandler(async (req, res) => {
    try {
        const { subjectName } = req.params;
        const subject = await Subject.findOne({ subject: subjectName });
        
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        const chapters = await Chapter.find({ subject: subject._id });
        const topics = await Topic.find({ subjectId: subject._id });
        const subtopics = await Subtopic.find({ subName: subjectName });
        const videos = await Video.find({ subName: subjectName });

        res.json({
            subject,
            chapters,
            topics,
            subtopics,
            videos
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});