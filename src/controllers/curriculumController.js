import Subject from '../models/Subject.js';
import Chapter from '../models/Chapter.js';
import VideoQuiz from '../models/VideosQuiz.js';
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

        // Get subject and chapters in parallel
        const [subject, chapters] = await Promise.all([
            Subject.findOne({ board, grade }).lean(),
            Chapter.find({ board, grade }).lean()
        ]);
        
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found for this board and grade' });
        }

        if (!chapters || chapters.length === 0) {
            return res.status(404).json({ message: 'No chapters found for this board and grade' });
        }

        // Build optimized data structure
        const completeContent = {
            _id: subject._id,
            subjectName: subject.subject || subject.subname, // Handle both field names
            board: subject.board,
            grade: subject.grade,
            medium: subject.medium,
            coverimg: subject.coverimg,
            chapters: chapters.map(chapter => ({
                _id: chapter._id,
                chapterName: chapter.chaptername,
                board: chapter.board,
                grade: chapter.grade,
                medium: chapter.medium,
                topics: chapter.topics.map(topic => ({
                    _id: topic._id,
                    topicName: topic.topicname,
                    subtopics: topic.subtopics.map(subtopic => ({
                        _id: subtopic._id,
                        subtopicName: subtopic.subtopicname,
                        // Videos will be fetched separately if needed
                    }))
                }))
            }))
        };
        
        // Cache the result
        setCache(cacheKey, completeContent);
        
        res.json(completeContent);

    } catch (err) {
        console.error('Error fetching complete curriculum content:', err);
        res.status(500).json({ error: err.message });
    }
});

export const postSubjects = asyncHandler(async (req, res) => {
    try {
        const { board, grade, subject, medium } = req.body;
        const cacheKey = getCacheKey(
            'subjects',
            board || 'all',
            grade || 'all',
            subject || 'all',
            medium || 'all'
        );

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

        // Handle multiple subject field names
        if (subject) {
            query.$or = [
                { name: subject },
                { subject: subject },
                { subname: subject }
            ];
        }

        if (medium) {
            query.medium = { $in: [medium] };
        }

        const subjects = await Subject.find(query)
            .select('name subject subname board grade medium coverimg')
            .lean();

        if (!subjects || subjects.length === 0) {
            return res.status(404).json({
                message: (board || grade || subject || medium)
                    ? 'No subjects found for the specified board, grade, subject, or medium'
                    : 'No subjects found in the database',
                query: { board, grade, subject, medium }
            });
        }

        // Transform: always return `name` (to match frontend expectations)
        const transformedSubjects = subjects.map(sub => ({
            _id: sub._id,
            board: sub.board,
            grade: sub.grade,
            medium: sub.medium,
            coverimg: sub.coverimg,
            subject: sub.name || sub.subject || sub.subname, // keep consistent
        }));

        // Cache result
        setCache(cacheKey, transformedSubjects);
        res.json(transformedSubjects);
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
        // Fetch all boards and grades from Subjects
        const subjects = await Subject.find({}, { board: 1, grade: 1, _id: 0 });

        // Extract unique boards and grades using Set
        const boardsSet = new Set();
        const gradesSet = new Set();

        subjects.forEach(subject => {
            if (subject.board) boardsSet.add(subject.board);
            if (subject.grade) gradesSet.add(subject.grade);
        });

        // Convert Sets to Arrays
        const boards = [...boardsSet];
        const grades = [...gradesSet];

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
        const { medium } = req.query;

        if (!board) {
            return res.status(400).json({ success: false, message: "Board is required" });
        }

        const query = { board };
        
        if (medium) {
            query.medium = { $in: [medium] };
        }

        const grades = await Subject.find(query).distinct('grade');

        grades.sort((a, b) => Number(a) - Number(b));
        
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

        // Get all mediums for the board
        const mediums = await Subject.find({ 
            board,
            medium: { $exists: true, $ne: null }
        }).distinct('medium');

        // Flatten and filter mediums
        const filteredMediums = mediums.flat().filter(medium => medium && medium.trim() !== '');

        if (filteredMediums.length === 0) {
            res.status(200).json({
                success: true,
                data: [],
                message: "No mediums available for this board"
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
        const { board, grade } = req.query;

        const cacheKey = getCacheKey('chapters', subjectName, board || 'any', grade || 'any');

        // Check cache first
        const cached = getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Find subject first to get subjectid - handle both field names
        const subject = await Subject.findOne({ 
            $or: [
                { subject: subjectName },
                { subname: subjectName }
            ],
            board, 
            grade 
        }).lean();

        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        // Build dynamic query
        const chapterQuery = { 
            board,
            grade,
            subjectid: subject._id
        };

        const chapters = await Chapter.find(chapterQuery)
            .select('chaptername board grade medium')
            .lean()
            .exec();

        if (chapters.length === 0) {
            return res.status(404).json({ message: 'No chapters found for this board and grade' });
        }

        // Cache the result
        setCache(cacheKey, chapters);
        res.json(chapters);
    } catch (err) {
        console.error('Error in getChapters:', err);
        res.status(500).json({ error: err.message });
    }
});

// @desc    Get topics for a specific chapter
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

        const chapter = await Chapter.findById(chapterId).lean();

        if (!chapter) {
            return res.status(404).json({ message: 'Chapter not found' });
        }

        if (!chapter.topics || chapter.topics.length === 0) {
            return res.status(404).json({ message: 'No topics found for this chapter' });
        }
        
        // Cache the result
        setCache(cacheKey, chapter.topics);
        res.json(chapter.topics);
    } catch (err) {
        console.error('Error in getTopics:', err);
        res.status(500).json({ error: err.message });
    }
});

// @desc    Get subtopics for a specific topic
// @route   GET /api/subtopics/:topicId
// @access  Private
export const getSubtopics = asyncHandler(async (req, res) => {
    try {
        const { chapterId, topicId } = req.params;
        const cacheKey = getCacheKey('subtopics', chapterId, topicId);
        
        // Check cache first
        const cached = getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const chapter = await Chapter.findById(chapterId).lean();
        if (!chapter) {
            return res.status(404).json({ message: 'Chapter not found' });
        }

        const topic = chapter.topics.find(t => t._id.toString() === topicId);
        if (!topic) {
            return res.status(404).json({ message: 'Topic not found' });
        }

        if (!topic.subtopics || topic.subtopics.length === 0) {
            return res.status(404).json({ message: 'No subtopics found for this topic' });
        }
        
        // Cache the result
        setCache(cacheKey, topic.subtopics);
        res.json(topic.subtopics);
    } catch (err) {
        console.error('Error in getSubtopics:', err);
        res.status(500).json({ error: err.message });
    }
});

// @desc    Get quiz for a specific video
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
        const cached = getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        let query = {};
        if (videoId) query._id = videoId;
        if (videoUrl) query.url = videoUrl;

        const videoQuiz = await VideoQuiz.findOne(query).lean().exec();

        if (!videoQuiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        // Transform the response to match expected format
        const transformedQuiz = {
            _id: videoQuiz._id,
            videoId: videoQuiz._id,
            videoUrl: videoQuiz.url || videoQuiz.videoUrl,
            questions: videoQuiz.quiz ? videoQuiz.quiz.map(q => ({
                que: q.question || q.que,
                opt: q.options || q.opt,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation
            })) : (videoQuiz.questions || []),
            chapterName: videoQuiz.chapterName,
            subName: videoQuiz.subjectname || videoQuiz.subName,
            subtopicName: videoQuiz.subtopicName,
            topicName: videoQuiz.topicName,
            board: videoQuiz.board,
            grade: videoQuiz.grade
        };

        setCache(cacheKey, transformedQuiz);
        res.json(transformedQuiz);

    } catch (err) {
        console.error('Error in getQuiz:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/curriculum/subject
export const getCurriculumBySubjectName = asyncHandler(async (req, res) => {
    const { subjectName, board, grade, medium } = req.body;
    
    if (!subjectName || !board || !grade) {
        return res.status(400).json({
            success: false,
            message: 'subjectName, board, and grade are required'
        });
    }

    const cacheKey = getCacheKey('curriculum', subjectName, board, grade, medium || 'none');

    try {
        // Check cache first
        const cached = getCache(cacheKey);
        if (cached) {
            return res.status(200).json({
                success: true,
                data: cached
            });
        }

        // Find subject with the correct field name from your schema
        const subjectQuery = {
            subject: subjectName, // Changed from 'name' to 'subject' based on your schema
            board,
            grade
        };

        if (medium) {
            subjectQuery.medium = { $in: [medium] };
        }

        const subject = await Subject.findOne(subjectQuery).lean();

        if (!subject) {
            return res.status(404).json({ 
                success: false,
                message: `Subject not found for ${board} board, grade ${grade}${medium ? `, medium ${medium}` : ''}`
            });
        }

        // Find chapters with the same filters
        const chapterQuery = {
            board,
            grade,
            subjectname: subjectName // Add subject filter to get only relevant chapters
        };

        if (medium) {
            chapterQuery.medium = { $in: [medium] };
        }

        // Get chapters and videos in parallel
        const [chapters, videos] = await Promise.all([
            Chapter.find(chapterQuery).lean(),
            VideoQuiz.find({ board, grade, subName: subjectName }).lean() // Add subject filter for videos too
        ]);

        console.log('Found videos:', videos.length); // Debug log

        if (!chapters || chapters.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No chapters found for this board and grade'
            });
        }

        // Build the curriculum structure with names
        const curriculum = {
            _id: subject._id,
            subjectName: subject.subject, // Use 'subject' field from your schema
            board: subject.board,
            grade: subject.grade,
            chapters: chapters.map(chapter => {
                const chapterData = {
                    _id: chapter._id,
                    chapterName: chapter.chaptername || 'Untitled Chapter', // This should now work correctly
                    // Videos directly under chapter (videos that don't belong to any specific topic/subtopic)
                    videos: videos
                        .filter(video => 
                            video.chapterName === (chapter.chaptername || 'Untitled Chapter') &&
                            (!video.topicName || video.topicName === '') && 
                            (!video.subtopicName || video.subtopicName === '')
                        )
                        .map(video => ({
                            _id: video._id,
                            videoUrl: video.videoUrl || video.url // Handle both possible field names
                        }))
                };

                // Add topics if they exist
                if (chapter.topics && chapter.topics.length > 0) {
                    chapterData.topics = chapter.topics.map(topic => {
                        const topicData = {
                            _id: topic._id,
                            topicName: topic.topicname || topic.name || 'Untitled Topic', // This should now work correctly
                            // Videos directly under topic (not under any subtopic)
                            videos: videos
                                .filter(video => 
                                    video.topicName === (topic.topicname || topic.name|| 'Untitled Topic') &&
                                    video.chapterName === (chapter.chaptername || 'Untitled Chapter') &&
                                    (!video.subtopicName || video.subtopicName === '')
                                )
                                .map(video => ({
                                    _id: video._id,
                                    videoUrl: video.videoUrl || video.url // Handle both possible field names
                                }))
                        };

                        // Add subtopics if they exist
                        if (topic.subtopics && topic.subtopics.length > 0) {
                            topicData.subtopics = topic.subtopics.map(subtopic => ({
                                _id: subtopic._id,
                                subtopicName: subtopic.subtopicname || 'Untitled Subtopic', // This should now work correctly
                                // Videos under subtopic
                                videos: videos
                                    .filter(video => 
                                        video.subtopicName === (subtopic.subtopicname || 'Untitled Subtopic') &&
                                        video.topicName === (topic.topicname || 'Untitled Topic') &&
                                        video.chapterName === (chapter.chaptername || 'Untitled Chapter')
                                    )
                                    .map(video => ({
                                        _id: video._id,
                                        videoUrl: video.videoUrl || video.url // Handle both possible field names
                                    }))
                            }));
                        }

                        return topicData;
                    });
                }

                return chapterData;
            })
        };

        // Cache it
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

// @route   GET /api/curriculum/video/:videoId
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
        
        const videoQuiz = await VideoQuiz.findById(videoId).lean();
        if (!videoQuiz) {
            return res.status(404).json({ 
                success: false,
                message: 'Video not found' 
            });
        }

        // Find related chapter and subject
        const chapter = await Chapter.findOne({
            chaptername: videoQuiz.chapterName,
            board: videoQuiz.board,
            grade: videoQuiz.grade
        }).lean();

        const subject = await Subject.findOne({
            $or: [
                { subject: videoQuiz.subjectname || videoQuiz.subName },
                { subname: videoQuiz.subjectname || videoQuiz.subName }
            ],
            board: videoQuiz.board,
            grade: videoQuiz.grade
        }).lean();

        const result = {
            _id: videoQuiz._id,
            url: videoQuiz.url || videoQuiz.videoUrl,
            quiz: videoQuiz.quiz || videoQuiz.questions,
            chapterName: videoQuiz.chapterName,
            topicName: videoQuiz.topicName,
            subtopicName: videoQuiz.subtopicName,
            board: videoQuiz.board,
            grade: videoQuiz.grade,
            chapter: chapter ? {
                _id: chapter._id,
                chapterName: chapter.chaptername,
                board: chapter.board,
                grade: chapter.grade
            } : null,
            subject: subject ? {
                _id: subject._id,
                name: subject.subject || subject.subname,
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