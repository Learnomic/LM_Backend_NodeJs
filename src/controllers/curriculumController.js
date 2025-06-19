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

export const postSubjects = asyncHandler(async (req, res) => {
    try {
        const { board, grade, subject, medium } = req.body; // Add medium to destructuring
        const cacheKey = getCacheKey('subjects', board || 'all', grade || 'all', subject || 'all', medium || 'all');

        // Check cache
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
        if (subject) query.subject = subject;
        if (medium) query.medium = medium; // Add medium to query

        const subjects = await Subject.find(query)
            .select('subject board grade medium') // Include medium in the select
            .lean();

        if (!subjects || subjects.length === 0) {
            return res.status(404).json({
                message: (board || grade || subject || medium)
                    ? 'No subjects found for the specified board, grade, subject, or medium'
                    : 'No subjects found in the database',
                query: { board, grade, subject, medium }
            });
        }

        // Cache result
        setCache(cacheKey, subjects);
        res.json(subjects);
    } catch (err) {
        console.error('Error in postSubjects:', err);
        res.status(500).json({
            error: err.message,
            message: 'Error fetching subjects'
        });
    }
});

export const getAvailableBoardsAndGrades = asyncHandler(async (req, res) => {
    try {
        const boards = await Subject.distinct('board');
        const grades = await Subject.distinct('grade');

        res.status(200).json({
            success: true,
            data: {
                boards,
                grades
            }
        });
    } catch (error) {
        console.error('Error fetching available options:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

export const getGradesForBoard = asyncHandler(async (req, res) => {
    try {
        const { board } = req.params;
        if (!board) {
            return res.status(400).json({ success: false, message: "Board is required" });
        }

        const grades = await Subject.find({ board }).distinct('grade');

        res.status(200).json({
            success: true,
            data: grades
        });
    } catch (error) {
        console.error('Error fetching grades:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

export const getMediumsForBoard = asyncHandler(async (req, res) => {
    try {
        const { board } = req.params;
        if (!board) {
            return res.status(400).json({ success: false, message: "Board is required" });
        }

        // Get all mediums for the board, filtering out null/undefined values
        const mediums = await Subject.find({ 
            board,
            medium: { $exists: true, $ne: null } // Only get documents where medium exists and is not null
        }).distinct('medium');

        // Additional filter to remove any falsy values that might have slipped through
        const filteredMediums = mediums.filter(medium => medium && medium.trim() !== '');

        // If no mediums found, it could mean the board doesn't use mediums
        if (filteredMediums.length === 0) {
            res.status(200).json({
                success: true,
                data: [],
                message: "No mediums available for this board (may not be applicable)"
            });
        } else {
            res.status(200).json({
                success: true,
                data: filteredMediums
            });
        }
    } catch (error) {
        console.error('Error fetching mediums:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

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


export const getCurriculumBySubjectName = asyncHandler(async (req, res) => {
    const { subjectName } = req.params;
    const { board, grade } = req.query; // Add board and grade as query parameters
    
    const cacheKey = getCacheKey('curriculum', subjectName, board, grade);

    try {
        // Check cache first
        const cached = getCache(cacheKey);
        if (cached) {
            return res.status(200).json({
                success: true,
                data: cached
            });
        }

        // Get all data in parallel with board and grade filtering
        const [subject, allChapters, allTopics, allSubtopics, allVideos] = await Promise.all([
            Subject.findOne({ subject: subjectName, board, grade }).lean(),
            Chapter.find({ subject: subjectName }).lean(),
            Topic.find().lean(),
            Subtopic.find({ subName: subjectName }).lean(),
            Video.find({ subName: subjectName }).lean()
        ]);

        if (!subject) {
            return res.status(404).json({ 
                message: `Subject not found for ${board} board and grade ${grade}` 
            });
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