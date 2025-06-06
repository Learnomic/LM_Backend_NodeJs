import Subject from '../models/Subject.js';
import Chapter from '../models/Chapter.js';
import Topic from '../models/Topic.js';
import Subtopic from '../models/Subtopic.js';
import Video from '../models/Video.js';
import Quiz from '../models/Quiz.js';
import asyncHandler from 'express-async-handler';
// import Result from '../models/Result.js'; // Assuming QuizScore replaces Result
// import Curriculum from '../models/Curriculum.js'; // Old model

// Optimized in-memory cache implementation
const curriculumCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

// Cache cleanup interval (every 10 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of curriculumCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            curriculumCache.delete(key);
        }
    }
}, 10 * 60 * 1000);

// Initialize indexes with compound indexes for better performance
export const initializeIndexes = async () => {
    try {
        // Add compound indexes for frequently queried fields
        await Subject.collection.createIndex({ subject: 1, board: 1, grade: 1 });
        await Chapter.collection.createIndex({ subject: 1, chapterName: 1 });
        await Topic.collection.createIndex({ 
            subjectId: 1, 
            chapterId: 1, 
            topicName: 1 
        });
        await Subtopic.collection.createIndex({ 
            subName: 1, 
            chapterName: 1, 
            topicName: 1, 
            subtopicName: 1 
        });
        await Video.collection.createIndex({ 
            subName: 1, 
            chapterName: 1, 
            topicName: 1, 
            subtopicName: 1 
        });
        console.log('Database indexes created successfully');
    } catch (error) {
        console.error('Error creating indexes:', error);
    }
};

// Batch size for processing
const BATCH_SIZE = 100;

// @desc    Get complete curriculum content
// @route   GET /api/content
// @access  Public
export const getCompleteContent = asyncHandler(async (req, res) => {
    try {
        const { board, grade } = req.query;

        if (!board || !grade) {
            return res.status(400).json({ 
                message: 'Board and grade are required query parameters' 
            });
        }

        // Find the subject for the given board and grade
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

// @desc    Get curriculum by subject name with pagination
// @route   GET /api/curriculum/:subjectName
// @access  Public
export const getCurriculumBySubjectName = asyncHandler(async (req, res) => {
    try {
        const { subjectName } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        console.log('Fetching curriculum for subject:', subjectName, 'page:', page, 'limit:', limit);

        // Create cache key
        const cacheKey = `curriculum:${subjectName}:${page}:${limit}`;

        // Check cache first
        const cachedResponse = curriculumCache.get(cacheKey);
        if (cachedResponse && (Date.now() - cachedResponse.timestamp < CACHE_TTL)) {
            console.log('Returning cached response for key:', cacheKey);
            return res.json(cachedResponse.data);
        }

        // Find the subject with lean query
        console.log('Finding subject in database:', subjectName);
        const subject = await Subject.findOne({ subject: subjectName })
            .lean()
            .select('_id subject board grade');

        if (!subject) {
            console.log('Subject not found:', subjectName);
            return res.status(404).json({
                success: false,
                message: 'Subject not found'
            });
        }

        try {
            // Fetch explain plan for paginatedChapters query
            const paginatedChaptersExplain = await Chapter.find({ subject: subjectName })
                .lean()
                .select('_id chapterName')
                .skip(skip)
                .limit(limit)
                .explain();

             console.log('Explain plan for paginatedChapters:', JSON.stringify(paginatedChaptersExplain, null, 2)); // Log explain output

            // Fetch paginated chapters data
            const paginatedChapters = await Chapter.find({ subject: subjectName })
                .lean()
                .select('_id chapterName')
                .skip(skip)
                .limit(limit);

            // Get total count of chapters for pagination info
            const totalChapters = await Chapter.countDocuments({ subject: subjectName });
            const totalPages = Math.ceil(totalChapters / limit);

            // Get the IDs of the paginated chapters
            const paginatedChapterIds = paginatedChapters.map(chapter => chapter._id);

            // Fetch explain plans for topics, subtopics, and videos queries concurrently
            const [allTopicsExplain, allSubtopicsExplain, allVideosExplain] = await Promise.all([
                Topic.find({ chapterId: { $in: paginatedChapterIds } }).lean().select('_id subjectId chapterId topicName').explain(),
                Subtopic.find({
                    subName: subjectName,
                    chapterName: { $in: paginatedChapters.map(c => c.chapterName) } // Filter by chapter names in the current page
                }).lean().select('_id subName chapterName topicName subtopicName').explain(),
                Video.find({
                    subName: subjectName,
                    chapterName: { $in: paginatedChapters.map(c => c.chapterName) } // Filter by chapter names in the current page
                }).lean().select('_id subName chapterName topicName subtopicName videoUrl').explain()
            ]);

             console.log('Explain plan for allTopics:', JSON.stringify(allTopicsExplain, null, 2)); // Log explain output
             console.log('Explain plan for allSubtopics:', JSON.stringify(allSubtopicsExplain, null, 2)); // Log explain output
             console.log('Explain plan for allVideos:', JSON.stringify(allVideosExplain, null, 2)); // Log explain output

            // Fetch topics, subtopics, and videos only for the paginated chapters concurrently
            const [allTopics, allSubtopics, allVideos] = await Promise.all([
                Topic.find({ chapterId: { $in: paginatedChapterIds } }).lean().select('_id subjectId chapterId topicName'),
                Subtopic.find({
                    subName: subjectName,
                    chapterName: { $in: paginatedChapters.map(c => c.chapterName) } // Filter by chapter names in the current page
                }).lean().select('_id subName chapterName topicName subtopicName'),
                Video.find({
                    subName: subjectName,
                    chapterName: { $in: paginatedChapters.map(c => c.chapterName) } // Filter by chapter names in the current page
                }).lean().select('_id subName chapterName topicName subtopicName videoUrl')
            ]);

            // Create maps for efficient lookup
            const topicsByChapterId = new Map();
            allTopics.forEach(topic => {
                const chapterIdStr = topic.chapterId.toString();
                if (!topicsByChapterId.has(chapterIdStr)) {
                    topicsByChapterId.set(chapterIdStr, []);
                }
                topicsByChapterId.get(chapterIdStr).push(topic);
            });

            const subtopicsByTopicKey = new Map();
            allSubtopics.forEach(subtopic => {
                 const key = `${subtopic.chapterName}-${subtopic.topicName}`;
                if (!subtopicsByTopicKey.has(key)) {
                    subtopicsByTopicKey.set(key, []);
                }
                subtopicsByTopicKey.get(key).push(subtopic);
            });

             const videosBySubtopicKey = new Map();
            allVideos.forEach(video => {
                const key = `${video.chapterName}-${video.topicName}-${video.subtopicName}`;
                if (!videosBySubtopicKey.has(key)) {
                    videosBySubtopicKey.set(key, []);
                }
                videosBySubtopicKey.get(key).push(video);
            });

            // Build the nested structure for the paginated chapters
            const processedChapters = paginatedChapters.map(chapter => {
                const topics = (topicsByChapterId.get(chapter._id.toString()) || []).map(topic => {
                    const subtopicKeyPrefix = `${chapter.chapterName}-${topic.topicName}`;
                     const subtopics = (subtopicsByTopicKey.get(subtopicKeyPrefix) || []).map(subtopic => {
                         const videoKey = `${subtopicKeyPrefix}-${subtopic.subtopicName}`;
                         const videos = (videosBySubtopicKey.get(videoKey) || []).map(video => ({
                             _id: video._id,
                             videoUrl: video.videoUrl
                         }));

                         return {
                             _id: subtopic._id,
                             subtopicName: subtopic.subtopicName,
                             videos: videos
                         };
                     });

                    return {
                        _id: topic._id,
                        topicName: topic.topicName,
                        subtopics: subtopics
                    };
                });

                return {
                    _id: chapter._id,
                    chapterName: chapter.chapterName,
                    topics: topics
                };
            });

            // Construct the response with pagination info
            const responseData = {
                success: true,
                data: {
                    _id: subject._id,
                    subjectName: subject.subject,
                    board: subject.board,
                    grade: subject.grade,
                    chapters: processedChapters,
                    pagination: {
                        currentPage: page,
                        totalPages,
                        totalChapters,
                        hasNextPage: page < totalPages,
                        hasPreviousPage: page > 1
                    }
                }
            };

            // Store response in cache
            curriculumCache.set(cacheKey, { data: responseData, timestamp: Date.now() });
            console.log('Cached response for key:', cacheKey);

            // Set response headers for compression
            res.setHeader('Content-Type', 'application/json');

            console.log('Sending successful response');
            res.json(responseData);

        } catch (error) {
            console.error('Error processing curriculum data:', error);
            console.error('Error stack:', error.stack);
            throw error; // Re-throw to be caught by the outer catch block
        }

    } catch (error) {
        console.error('Error in getCurriculumBySubjectName:', error);
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            keyPattern: error.keyPattern,
            keyValue: error.keyValue
        });

        res.status(500).json({
            success: false,
            message: 'Failed to fetch curriculum',
            error: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                stack: error.stack,
                details: {
                    name: error.name,
                    code: error.code,
                    keyPattern: error.keyPattern,
                    keyValue: error.keyValue
                }
            } : 'Internal server error'
        });
    }
});

// @desc    Post curriculum form with nested structure
// @route   POST /api/curriculum/postCurriculumForm
// @access  Private
export const postCurriculumForm = asyncHandler(async (req, res) => {
    try {
        const {
            subjectName,
            board,
            grade,
            chapters
        } = req.body;

        console.log('Received data:', JSON.stringify(req.body, null, 2));

        // Validate required fields
        if (!subjectName || !board || !grade || !chapters || !Array.isArray(chapters)) {
            return res.status(400).json({
                success: false,
                message: 'Subject name, board, grade, and chapters array are required'
            });
        }

        // Check if subject already exists, if not create it
        let subject = await Subject.findOne({ 
            subject: subjectName,
            board: board,
            grade: grade.toString()
        });
        
        if (!subject) {
            subject = new Subject({
                subject: subjectName,
                board: board,
                grade: grade.toString()
            });
            await subject.save();
            console.log('Created new subject:', subject);
        }

        // Process each chapter and collect all created data
        const processedChapters = [];
        let totalQuestions = 0;
        let totalVideos = 0;
        let allQuestions = [];
        let firstVideoUrl = null;
        let firstVideoId = null;
        let firstChapterName = null;
        let firstTopicName = null;
        let firstSubtopicName = null;

        for (const chapterData of chapters) {
            const { chapterName, topics } = chapterData;

            if (!chapterName || !topics || !Array.isArray(topics)) {
                console.log('Skipping invalid chapter:', chapterName);
                continue;
            }

            // Check if chapter exists, if not create it
            let chapter = await Chapter.findOne({ 
                subject: subjectName, 
                chapterName: chapterName
            });
            
            if (!chapter) {
                chapter = new Chapter({
                    subject: subjectName,
                    chapterName: chapterName
                });
                await chapter.save();
                console.log('Created new chapter:', chapter);
            }

            // Set first chapter name
            if (!firstChapterName) {
                firstChapterName = chapter.chapterName;
            }

            // Process each topic
            for (const topicData of topics) {
                const { topicName, subtopics } = topicData;

                if (!topicName || !subtopics || !Array.isArray(subtopics)) {
                    console.log('Skipping invalid topic:', topicName);
                    continue;
                }

                // Check if topic exists, if not create it
                let topic = await Topic.findOne({ 
                    subjectId: subject._id,
                    chapterId: chapter._id,
                    topicName: topicName
                });

                if (!topic) {
                    topic = new Topic({
                        subjectId: subject._id,
                        chapterId: chapter._id,
                        topicName: topicName
                    });
                    await topic.save();
                    console.log('Created new topic:', topic);
                }

                // Set first topic name
                if (!firstTopicName) {
                    firstTopicName = topic.topicName;
                }

                // Process each subtopic
                for (const subtopicData of subtopics) {
                    const { subtopicName, videos } = subtopicData;

                    if (!subtopicName || !videos || !Array.isArray(videos)) {
                        console.log('Skipping invalid subtopic:', subtopicName);
                        continue;
                    }

                    // Check if subtopic exists, if not create it
                    let subtopic = await Subtopic.findOne({
                        subName: subjectName,
                        chapterName: chapterName,
                        topicName: topicName,
                        subtopicName: subtopicName
                    });

                    if (!subtopic) {
                        subtopic = new Subtopic({
                            subName: subjectName,
                            chapterName: chapterName,
                            topicName: topicName,
                            subtopicName: subtopicName
                        });
                        await subtopic.save();
                        console.log('Created new subtopic:', subtopic);
                    }

                    // Set first subtopic name
                    if (!firstSubtopicName) {
                        firstSubtopicName = subtopic.subtopicName;
                    }

                    // Process each video
                    for (const videoData of videos) {
                        const { videoUrl, quiz } = videoData;

                        if (!videoUrl) {
                            console.log('Skipping video without URL');
                            continue;
                        }

                        // Check if video exists, if not create it
                        let video = await Video.findOne({
                            subName: subjectName,
                            chapterName: chapterName,
                            topicName: topicName,
                            subtopicName: subtopicName,
                            videoUrl: videoUrl
                        });

                        if (!video) {
                            video = new Video({
                                subName: subjectName,
                                chapterName: chapterName,
                                topicName: topicName,
                                subtopicName: subtopicName,
                                videoUrl: videoUrl
                            });
                            await video.save();
                            console.log('Created new video:', video);
                        }

                        totalVideos++;

                        // Set first video details
                        if (!firstVideoUrl) {
                            firstVideoUrl = video.videoUrl;
                            firstVideoId = video._id.toString();
                        }

                        // Process quiz if provided
                        if (quiz && quiz.questions && Array.isArray(quiz.questions) && quiz.questions.length > 0) {
                            // Filter out empty questions
                            const validQuestions = quiz.questions.filter(q => 
                                q.que && q.que.trim() !== '' && q.correctAnswer
                            );

                            if (validQuestions.length > 0) {
                                // Check if quiz exists, if not create it
                                let existingQuiz = await Quiz.findOne({
                                    videoId: video._id.toString(),
                                    videoUrl: videoUrl
                                });

                                if (!existingQuiz) {
                                    const processedQuestions = validQuestions.map(q => ({
                                        que: q.que,
                                        opt: {
                                            a: q.opt?.a || '',
                                            b: q.opt?.b || '',
                                            c: q.opt?.c || '',
                                            d: q.opt?.d || ''
                                        },
                                        correctAnswer: q.correctAnswer,
                                        explanation: q.explanation || ''
                                    }));

                                    const newQuiz = new Quiz({
                                        videoId: video._id.toString(),
                                        videoUrl: videoUrl,
                                        questions: processedQuestions
                                    });
                                    await newQuiz.save();
                                    console.log('Created new quiz:', newQuiz);
                                    
                                    totalQuestions += newQuiz.questions.length;
                                    
                                    // Add questions with _id FIRST, then other properties
                                    const questionsWithId = newQuiz.questions.map(q => ({
                                        _id: q._id,
                                        que: q.que,
                                        opt: q.opt,
                                        correctAnswer: q.correctAnswer,
                                        explanation: q.explanation
                                    }));
                                    allQuestions = allQuestions.concat(questionsWithId);
                                } else {
                                    totalQuestions += existingQuiz.questions.length;
                                    
                                    // Add existing questions with _id FIRST, then other properties
                                    const questionsWithId = existingQuiz.questions.map(q => ({
                                        _id: q._id,
                                        que: q.que,
                                        opt: q.opt,
                                        correctAnswer: q.correctAnswer,
                                        explanation: q.explanation
                                    }));
                                    allQuestions = allQuestions.concat(questionsWithId);
                                }
                            }
                        }
                    }
                }
            }

            processedChapters.push({
                id: chapter._id,
                chapterName: chapter.chapterName
            });
        }

        // Select first 10 questions for response (matching the expected format)
        const selectedQuestions = allQuestions.slice(0, 10);
        const selectedQuestionsCount = Math.min(totalQuestions, 10);

        // Format response according to the desired JSON structure
        const responseData = {
            success: true,
            data: {
                _id: subject._id,
                videoUrl: firstVideoUrl || "Multiple videos processed",
                videoId: firstVideoId || subject._id.toString(),
                questions: selectedQuestions,
                totalQuestions: totalQuestions,
                selectedQuestionsCount: selectedQuestionsCount,
                subject: {
                    name: subject.subject,
                    chapterName: firstChapterName || "Multiple Chapters",
                    topicName: firstTopicName || "Multiple Topics",
                    subtopicName: firstSubtopicName || "Multiple Subtopics"
                }
            }
        };

        res.status(201).json(responseData);

    } catch (error) {
        console.error('Error creating curriculum:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to create curriculum',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});