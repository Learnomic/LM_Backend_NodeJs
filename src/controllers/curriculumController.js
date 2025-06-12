import Subject from '../models/Subject.js';
import Chapter from '../models/Chapter.js';
import Topic from '../models/Topic.js';
import Subtopic from '../models/Subtopic.js';
import Video from '../models/Video.js';
import Quiz from '../models/Quiz.js';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';

// In-memory cache for frequently accessed data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache helper functions
const getCacheKey = (...args) => args.join(':');
const setCache = (key, data) => {
    cache.set(key, { data, timestamp: Date.now() });
};
const getCache = (key) => {
    const cached = cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.data;
    }
    cache.delete(key);
    return null;
};

// @desc    Get complete curriculum content for user's board and grade (ULTRA FAST)
// @route   GET /api/content
// @access  Private
export const getCompleteContent = asyncHandler(async (req, res) => {
    try {
        const { board, grade } = req.user;
        const cacheKey = getCacheKey('complete', board, grade);
        
        // Check cache first
        const cached = getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Parallel queries for better performance
        const [subjects, allChapters, allTopics, allSubtopics, allVideos] = await Promise.all([
            Subject.find({ board, grade }).lean(),
            Chapter.find().lean(),
            Topic.find().lean(),
            Subtopic.find().lean(),
            Video.find().lean()
        ]);
        
        if (!subjects || subjects.length === 0) {
            return res.status(404).json({ message: 'Subject not found for this board and grade' });
        }

        const subject = subjects[0];
        
        // Build optimized data structure using Map for O(1) lookups
        const completeContent = buildCompleteContentFast(subject, allChapters, allTopics, allSubtopics, allVideos);
        
        // Cache the result
        setCache(cacheKey, completeContent);
        
        res.json(completeContent);

    } catch (err) {
        console.error('Error fetching complete curriculum content:', err);
        res.status(500).json({ error: err.message });
    }
});

// Ultra-fast content builder using Maps for O(1) lookups
function buildCompleteContentFast(subject, allChapters, allTopics, allSubtopics, allVideos) {
    // Create lookup maps for O(1) performance
    const chapterMap = new Map();
    const topicMap = new Map();
    const subtopicMap = new Map();
    const videoMap = new Map();

    // Index chapters
    allChapters.forEach(chapter => {
        if (chapter.subject === subject.subject) {
            const key = chapter.subject;
            if (!chapterMap.has(key)) chapterMap.set(key, []);
            chapterMap.get(key).push(chapter);
        }
    });

    // Index topics by chapterId
    allTopics.forEach(topic => {
        const key = topic.chapterId.toString();
        if (!topicMap.has(key)) topicMap.set(key, []);
        topicMap.get(key).push(topic);
    });

    // Index subtopics by composite key
    allSubtopics.forEach(subtopic => {
        const key = `${subtopic.subName}:${subtopic.chapterName}:${subtopic.topicName}`;
        if (!subtopicMap.has(key)) subtopicMap.set(key, []);
        subtopicMap.get(key).push(subtopic);
    });

    // Index videos by composite key
    allVideos.forEach(video => {
        const key = `${video.subName}:${video.chapterName}:${video.topicName}:${video.subtopicName}`;
        if (!videoMap.has(key)) videoMap.set(key, []);
        videoMap.get(key).push(video);
    });

    // Build structure
    const chapters = (chapterMap.get(subject.subject) || []).map(chapter => {
        const topics = (topicMap.get(chapter._id.toString()) || []).map(topic => {
            const subtopicKey = `${subject.subject}:${chapter.chapterName}:${topic.topicName}`;
            const subtopics = (subtopicMap.get(subtopicKey) || []).map(subtopic => {
                const videoKey = `${subject.subject}:${chapter.chapterName}:${topic.topicName}:${subtopic.subtopicName}`;
                const videos = videoMap.get(videoKey) || [];
                
                return { ...subtopic, videos };
            });
            
            return { ...topic, subtopics };
        });
        
        return { ...chapter, topics };
    });

    return { ...subject, chapters };
}

// @desc    Get all subjects (CACHED)
// @route   GET /api/subjects
// @access  Private
export const getSubjects = asyncHandler(async (req, res) => {
    try {
        const { board, grade } = req.query;
        const cacheKey = getCacheKey('subjects', board || 'all', grade || 'all');
        
        // Check cache first
        const cached = getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }
        
        let query = {};
        if (board) query.board = board;
        if (grade) {
            query.$or = [
                { grade: grade },
                { grade: grade.toString() }
            ];
        }

        const subjects = await Subject.find(query)
            .select('subject board grade')
            .lean()
            .exec();

        if (!subjects || subjects.length === 0) {
            const message = (board || grade) 
                ? 'No subjects found for the specified board and grade'
                : 'No subjects found in the database';
            return res.status(404).json({ message, query: { board, grade } });
        }

        // Cache the result
        setCache(cacheKey, subjects);
        res.json(subjects);
    } catch (err) {
        console.error('Error in getSubjects:', err);
        res.status(500).json({ 
            error: err.message,
            message: 'Error fetching subjects'
        });
    }
});

// @desc    Get chapters for a specific subject (CACHED)
// @route   GET /api/chapters/:subjectName
// @access  Private
export const getChapters = asyncHandler(async (req, res) => {
    try {
        const { subjectName } = req.params;
        const cacheKey = getCacheKey('chapters', subjectName);
        
        // Check cache first
        const cached = getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }
        
        const chapters = await Chapter.find({ subject: subjectName })
            .select('chapterName subject')
            .lean()
            .exec();
        
        if (chapters.length === 0) {
            return res.status(404).json({ message: 'No chapters found for this subject' });
        }
        
        // Cache the result
        setCache(cacheKey, chapters);
        res.json(chapters);
    } catch (err) {
        console.error('Error in getChapters:', err);
        res.status(500).json({ error: err.message });
    }
});

// @desc    Get topics for a specific chapter (OPTIMIZED)
// @route   GET /api/topics/:chapterId
// @access  Private
export const getTopics = asyncHandler(async (req, res) => {
    try {
        const { chapterId } = req.params;
        const cacheKey = getCacheKey('topics', chapterId);
        
        // Check cache first
        const cached = getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Parallel queries
        const [chapter, subject] = await Promise.all([
            Chapter.findById(chapterId).lean(),
            Chapter.findById(chapterId).lean().then(ch => 
                ch ? Subject.findOne({ subject: ch.subject }).lean() : null
            )
        ]);

        if (!chapter) {
            return res.status(404).json({ message: 'Chapter not found' });
        }

        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        const topics = await Topic.find({ 
            chapterId: mongoose.Types.ObjectId(chapterId),
            subjectId: subject._id
        }).lean();
        
        if (topics.length === 0) {
            return res.status(404).json({ message: 'No topics found for this chapter' });
        }
        
        // Cache the result
        setCache(cacheKey, topics);
        res.json(topics);
    } catch (err) {
        console.error('Error in getTopics:', err);
        res.status(500).json({ error: err.message });
    }
});

// @desc    Get subtopics for a specific topic (OPTIMIZED)
// @route   GET /api/subtopics/:topicId
// @access  Private
export const getSubtopics = asyncHandler(async (req, res) => {
    try {
        const { topicId } = req.params;
        const cacheKey = getCacheKey('subtopics', topicId);
        
        // Check cache first
        const cached = getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Parallel queries for better performance
        const topic = await Topic.findById(topicId).lean();
        if (!topic) {
            return res.status(404).json({ message: 'Topic not found' });
        }

        const chapter = await Chapter.findById(topic.chapterId).lean();
        if (!chapter) {
            return res.status(404).json({ message: 'Chapter not found' });
        }

        const subtopics = await Subtopic.find({
            topicName: topic.topicName,
            chapterName: chapter.chapterName,
            subName: chapter.subject
        }).lean();
        
        if (subtopics.length === 0) {
            return res.status(404).json({ message: 'No subtopics found for this topic' });
        }
        
        // Cache the result
        setCache(cacheKey, subtopics);
        res.json(subtopics);
    } catch (err) {
        console.error('Error in getSubtopics:', err);
        res.status(500).json({ error: err.message });
    }
});

// @desc    Get videos for a specific subtopic (OPTIMIZED)
// @route   GET /api/videos/:subtopicId
// @access  Private
export const getVideos = asyncHandler(async (req, res) => {
    try {
        const { subtopicId } = req.params;
        const cacheKey = getCacheKey('videos', subtopicId);
        
        // Check cache first
        const cached = getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const subtopic = await Subtopic.findById(subtopicId).lean();
        if (!subtopic) {
            return res.status(404).json({ message: 'Subtopic not found' });
        }

        const videos = await Video.find({
            subName: subtopic.subName,
            chapterName: subtopic.chapterName,
            topicName: subtopic.topicName,
            subtopicName: subtopic.subtopicName
        }).lean();
        
        if (videos.length === 0) {
            return res.status(404).json({ message: 'No videos found for this subtopic' });
        }
        
        // Cache the result
        setCache(cacheKey, videos);
        res.json(videos);
    } catch (err) {
        console.error('Error in getVideos:', err);
        res.status(500).json({ error: err.message });
    }
});

// @desc    Get quiz for a specific video (CACHED)
// @route   GET /api/quiz/:videoId?
// @access  Private
export const getQuiz = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params;
        const { videoUrl } = req.query;

        if (!videoId && !videoUrl) {
            return res.status(400).json({ message: 'Please provide either videoId or videoUrl' });
        }

        const cacheKey = getCacheKey('quiz', videoId || videoUrl);
        
        // Check cache first
        const cached = getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        let query = {};
        if (videoId) query.videoId = videoId;
        if (videoUrl) query.videoUrl = videoUrl;

        const quiz = await Quiz.findOne(query).lean().exec();

        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        // Cache the result
        setCache(cacheKey, quiz);
        res.json(quiz);

    } catch (err) {
        console.error('Error in getQuiz:', err);
        res.status(500).json({ error: err.message });
    }
});

// @desc    Get curriculum by subject name (ULTRA OPTIMIZED)
// @route   GET /api/curriculum/:subjectName
// @access  Public
export const getCurriculumBySubjectName = asyncHandler(async (req, res) => {
    const { subjectName } = req.params;
    const cacheKey = getCacheKey('curriculum', subjectName);

    try {
        // Check cache first
        const cached = getCache(cacheKey);
        if (cached) {
            return res.status(200).json({
                success: true,
                data: cached
            });
        }

        // Get all data in parallel
        const [subject, allChapters, allTopics, allSubtopics, allVideos] = await Promise.all([
            Subject.findOne({ subject: subjectName }).lean(),
            Chapter.find({ subject: subjectName }).lean(),
            Topic.find().lean(),
            Subtopic.find({ subName: subjectName }).lean(),
            Video.find({ subName: subjectName }).lean()
        ]);

        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        // Build curriculum using optimized approach
        const curriculum = buildCurriculumFast(subject, allChapters, allTopics, allSubtopics, allVideos);

        // Cache the result
        setCache(cacheKey, curriculum);

        res.status(200).json({
            success: true,
            data: curriculum
        });

    } catch (error) {
        console.error('Error fetching curriculum:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch curriculum',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Ultra-fast curriculum builder
function buildCurriculumFast(subject, allChapters, allTopics, allSubtopics, allVideos) {
    // Create lookup maps
    const topicsByChapter = new Map();
    const subtopicsByKey = new Map();
    const videosByKey = new Map();

    // Index topics by chapterId
    allTopics.forEach(topic => {
        const key = topic.chapterId.toString();
        if (!topicsByChapter.has(key)) topicsByChapter.set(key, []);
        topicsByChapter.get(key).push(topic);
    });

    // Index subtopics
    allSubtopics.forEach(subtopic => {
        const key = `${subtopic.chapterName}:${subtopic.topicName}`;
        if (!subtopicsByKey.has(key)) subtopicsByKey.set(key, []);
        subtopicsByKey.get(key).push(subtopic);
    });

    // Index videos
    allVideos.forEach(video => {
        const key = `${video.chapterName}:${video.topicName}:${video.subtopicName}`;
        if (!videosByKey.has(key)) videosByKey.set(key, []);
        videosByKey.get(key).push(video);
    });

    // Build structure
    const chapters = allChapters.map(chapter => {
        const topics = (topicsByChapter.get(chapter._id.toString()) || []).map(topic => {
            const subtopicKey = `${chapter.chapterName}:${topic.topicName}`;
            const subtopics = (subtopicsByKey.get(subtopicKey) || []).map(subtopic => {
                const videoKey = `${chapter.chapterName}:${topic.topicName}:${subtopic.subtopicName}`;
                const videos = (videosByKey.get(videoKey) || []).map(video => ({
                    _id: video._id,
                    videoUrl: video.videoUrl
                }));
                
                return {
                    _id: subtopic._id,
                    subtopicName: subtopic.subtopicName,
                    videos
                };
            });
            
            return {
                _id: topic._id,
                topicName: topic.topicName,
                subtopics
            };
        });
        
        return {
            _id: chapter._id,
            chapterName: chapter.chapterName,
            topics
        };
    });

    return {
        _id: subject._id,
        subjectName: subject.subject,
        board: subject.board,
        grade: subject.grade,
        chapters
    };
}

// @desc    Add video to a subtopic (OPTIMIZED)
// @route   POST /api/curriculum/video
// @access  Private/Admin
export const addVideo = asyncHandler(async (req, res) => {
    try {
        const { subName, chapterName, topicName, subtopicName, videoUrl } = req.body;

        if (!subName || !chapterName || !topicName || !subtopicName || !videoUrl) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: subName, chapterName, topicName, subtopicName, videoUrl'
            });
        }

        // Check for duplicate and create in parallel if possible
        const existingVideo = await Video.findOne({
            subName, chapterName, topicName, subtopicName, videoUrl
        }).lean();

        if (existingVideo) {
            return res.status(409).json({
                success: false,
                message: 'Video already exists for this subtopic'
            });
        }

        const video = await Video.create({
            subName, chapterName, topicName, subtopicName, videoUrl
        });

        // Clear related caches
        const keysToDelete = [];
        for (const [key] of cache) {
            if (key.includes(subName) || key.includes('curriculum') || key.includes('complete')) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => cache.delete(key));

        res.status(201).json({
            success: true,
            message: 'Video added successfully',
            data: video
        });

    } catch (error) {
        console.error('Error adding video:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add video',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @desc    Get video by ID (CACHED)
// @route   GET /api/curriculum/video/:videoId
// @access  Private
export const getVideoById = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params;
        const cacheKey = getCacheKey('videoById', videoId);
        
        // Check cache first
        const cached = getCache(cacheKey);
        if (cached) {
            return res.json({
                success: true,
                data: cached
            });
        }
        
        // Parallel queries
        const video = await Video.findById(videoId).lean();
        if (!video) {
            return res.status(404).json({ 
                success: false,
                message: 'Video not found' 
            });
        }

        const subject = await Subject.findOne({ subject: video.subName }).lean();

        const result = {
            _id: video._id,
            title: video.title,
            videoUrl: video.videoUrl,
            subName: video.subName,
            chapterName: video.chapterName,
            topicName: video.topicName,
            subtopicName: video.subtopicName,
            subject: subject ? {
                _id: subject._id,
                name: subject.subject,
                board: subject.board,
                grade: subject.grade
            } : null
        };

        // Cache the result
        setCache(cacheKey, result);

        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        console.error('Error in getVideoById:', err);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching video',
            error: err.message 
        });
    }
});

// @desc    Create curriculum with bulk operations (OPTIMIZED)
// @route   POST /api/curriculum/form
// @access  Private/Admin
export const postCurriculum = asyncHandler(async (req, res) => {
    try {
        const { subjectName, board, grade, chapters } = req.body;

        if (!subjectName || !board || !grade || !chapters || !Array.isArray(chapters)) {
            return res.status(400).json({
                success: false,
                message: 'Subject name, board, grade, and chapters array are required'
            });
        }

        // Use MongoDB session for transaction
        const session = await mongoose.startSession();
        let result;

        try {
            await session.withTransaction(async () => {
                // Upsert subject
                const subject = await Subject.findOneAndUpdate(
                    { subject: subjectName, board: board, grade: grade.toString() },
                    { subject: subjectName, board: board, grade: grade.toString() },
                    { upsert: true, new: true, session }
                );

                // Use bulk operations for better performance
                result = await processCurriculumDataBulk(subject, chapters, subjectName, session);
                result.subject = subject;
            });
        } finally {
            await session.endSession();
        }

        // Clear all caches after successful update
        cache.clear();

        const selectedQuestions = result.allQuestions.slice(0, 10);

        res.status(201).json({
            success: true,
            data: {
                _id: result.subject._id,
                videoUrl: result.firstVideoUrl || "Multiple videos processed",
                videoId: result.firstVideoId || result.subject._id.toString(),
                questions: selectedQuestions,
                totalQuestions: result.totalQuestions,
                totalVideos: result.totalVideos,
                chapters: result.totalChapters,
                topics: result.totalTopics,
                subtopics: result.totalSubtopics
            }
        });

    } catch (error) {
        console.error('Error in postCurriculum:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create curriculum',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Optimized bulk processing function
async function processCurriculumDataBulk(subject, chapters, subjectName, session) {
    let totalQuestions = 0;
    let totalVideos = 0;
    let totalChapters = 0;
    let totalTopics = 0;
    let totalSubtopics = 0;
    let allQuestions = [];
    let firstVideoUrl = null;
    let firstVideoId = null;

    // Prepare bulk operations
    const chapterOps = [];
    const topicOps = [];
    const subtopicOps = [];
    const videoOps = [];
    const quizOps = [];

    // Process all data first
    for (const chapterData of chapters) {
        const { chapterName, topics } = chapterData;
        if (!chapterName || !topics) continue;

        chapterOps.push({
            updateOne: {
                filter: { subject: subjectName, chapterName: chapterName },
                update: { subject: subjectName, chapterName: chapterName },
                upsert: true
            }
        });
        totalChapters++;

        for (const topicData of topics) {
            const { topicName, subtopics } = topicData;
            if (!topicName || !subtopics) continue;

            totalTopics++;

            for (const subtopicData of subtopics) {
                const { subtopicName, videos } = subtopicData;
                if (!subtopicName || !videos) continue;

                subtopicOps.push({
                    updateOne: {
                        filter: {
                            subName: subjectName,
                            chapterName: chapterName,
                            topicName: topicName,
                            subtopicName: subtopicName
                        },
                        update: {
                            subName: subjectName,
                            chapterName: chapterName,
                            topicName: topicName,
                            subtopicName: subtopicName
                        },
                        upsert: true
                    }
                });
                totalSubtopics++;

                for (const videoData of videos) {
                    const { videoUrl, quiz } = videoData;
                    if (!videoUrl) continue;

                    videoOps.push({
                        updateOne: {
                            filter: {
                                subName: subjectName,
                                chapterName: chapterName,
                                topicName: topicName,
                                subtopicName: subtopicName,
                                videoUrl: videoUrl
                            },
                            update: {
                                subName: subjectName,
                                chapterName: chapterName,
                                topicName: topicName,
                                subtopicName: subtopicName,
                                videoUrl: videoUrl
                            },
                            upsert: true
                        }
                    });

                    totalVideos++;
                    if (!firstVideoUrl) {
                        firstVideoUrl = videoUrl;
                        firstVideoId = new mongoose.Types.ObjectId().toString();
                    }

                    // Process quiz
                    if (quiz && quiz.questions && Array.isArray(quiz.questions)) {
                        const validQuestions = quiz.questions.filter(q => 
                            q.que && q.que.trim() !== '' && q.correctAnswer
                        );

                        if (validQuestions.length > 0) {
                            const processedQuestions = validQuestions.map(q => ({
                                _id: new mongoose.Types.ObjectId(),
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

                            quizOps.push({
                                updateOne: {
                                    filter: { videoUrl: videoUrl },
                                    update: {
                                        videoUrl: videoUrl,
                                        questions: processedQuestions
                                    },
                                    upsert: true
                                }
                            });

                            totalQuestions += processedQuestions.length;
                            allQuestions = allQuestions.concat(processedQuestions);
                        }
                    }
                }
            }
        }
    }

    // Execute all bulk operations in parallel
    const bulkPromises = [];
    
    if (chapterOps.length > 0) {
        bulkPromises.push(Chapter.bulkWrite(chapterOps, { session }));
    }
    if (subtopicOps.length > 0) {
        bulkPromises.push(Subtopic.bulkWrite(subtopicOps, { session }));
    }
    if (videoOps.length > 0) {
        bulkPromises.push(Video.bulkWrite(videoOps, { session }));
    }
    if (quizOps.length > 0) {
        bulkPromises.push(Quiz.bulkWrite(quizOps, { session }));
    }

    await Promise.all(bulkPromises);

    // Handle topics separately as they need chapter IDs
    if (totalTopics > 0) {
        const createdChapters = await Chapter.find({ subject: subjectName }, null, { session });
        const chapterMap = new Map(createdChapters.map(c => [c.chapterName, c._id]));

        const topicBulkOps = [];
        for (const chapterData of chapters) {
            const { chapterName, topics } = chapterData;
            const chapterId = chapterMap.get(chapterName);

            for (const topicData of topics) {
                const { topicName } = topicData;
                if (!topicName) continue;

                topicBulkOps.push({
                    updateOne: {
                        filter: {
                            subjectId: subject._id,
                            chapterId: chapterId,
                            topicName: topicName
                        },
                        update: {
                            subjectId: subject._id,
                            chapterId: chapterId,
                            topicName: topicName
                        },
                        upsert: true
                    }
                });
            }
        }

        if (topicBulkOps.length > 0) {
            await Topic.bulkWrite(topicBulkOps, { session });
        }
    }

    return {
        totalQuestions,
        totalVideos,
        totalChapters,
        totalTopics,
        totalSubtopics,
        allQuestions,
        firstVideoUrl,
        firstVideoId
    };
}

// @desc    Post curriculum form data
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