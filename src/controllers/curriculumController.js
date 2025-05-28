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
        // Get board and grade from query parameters (optional)
        const { board, grade } = req.query;

        console.log('Searching for subjects with:', { board, grade });

        let query = {};

        // Build query based on provided parameters
        if (board) {
            query.board = board;
        }
        if (grade) {
             query.$or = [
                { grade: grade },
                { grade: grade.toString() } // Handle both string and number grades
            ];
        }

        // Find subjects matching the criteria
        const subjects = await Subject.find(query);

        console.log('Found subjects:', subjects);

        if (!subjects || subjects.length === 0) {
            // If filters were applied and no subjects found, indicate that.
            if (board || grade) {
                 return res.status(404).json({
                     message: 'No subjects found for the specified board and grade',
                     query: { board, grade }
                 });
            } else {
                 // If no filters were applied and no subjects found at all.
                 return res.status(404).json({
                     message: 'No subjects found in the database'
                 });
            }
        }

        res.json(subjects);
    } catch (err) {
        console.error('Error in getSubjects:', err);
        res.status(500).json({ 
            error: err.message,
            message: 'Error fetching subjects'
        });
    }
});

// @desc    Get chapters for a specific subject
// @route   GET /api/chapters/:subjectName
// @access  Private
export const getChapters = asyncHandler(async (req, res) => {
    try {
        const { subjectName } = req.params;
        
        // Find chapters for this subject using subject name
        const chapters = await Chapter.find({ subject: subjectName });
        
        if (chapters.length === 0) {
            return res.status(404).json({ message: 'No chapters found for this subject' });
        }
        
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
        
        console.log('Attempting to get topics for chapterId:', chapterId);

        // Find the chapter to get its subject name
        const chapter = await Chapter.findById(chapterId);
        if (!chapter) {
            console.log('Chapter not found for chapterId:', chapterId);
            return res.status(404).json({ message: 'Chapter not found' });
        }

        console.log('Found chapter:', chapter);

        // Find the corresponding Subject document using the subject name from the chapter
        const subject = await Subject.findOne({ subject: chapter.subject });
        if (!subject) {
             // This case might indicate inconsistent data, but handling it to prevent errors
             console.warn(`Subject document not found for subject name: ${chapter.subject} from chapter ID: ${chapterId}`);
             return res.status(404).json({ message: 'Corresponding subject not found for this chapter' });
        }

        console.log('Found subject for chapter subject name:', subject);

        // Find topics for this chapter using both chapter and subject IDs
        const query = { 
            chapterId: chapter._id,
            subjectId: subject._id // Use subject._id from the found Subject document
        };
        console.log('Querying Topics with:', query);
        
        const topics = await Topic.find(query);
        
        console.log('Found topics:', topics);

        if (topics.length === 0) {
            console.log('No topics found for this chapter with the constructed query.', query);
            return res.status(404).json({ message: 'No topics found for this chapter' });
        }
        
        res.json(topics);
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
        const { topicId } = req.params;
        
        // First get the topic to get its details
        const topic = await Topic.findById(topicId);
        if (!topic) {
            return res.status(404).json({ message: 'Topic not found' });
        }

        // Get chapter details
        const chapter = await Chapter.findById(topic.chapterId);
        if (!chapter) {
            return res.status(404).json({ message: 'Chapter not found' });
        }

        // Find subtopics for this topic
        const subtopics = await Subtopic.find({ 
            subName: chapter.subject,
            chapterName: chapter.chapterName,
            topicName: topic.topicName
        });
        
        if (subtopics.length === 0) {
            return res.status(404).json({ message: 'No subtopics found for this topic' });
        }
        
        res.json(subtopics);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @desc    Get videos for a specific subtopic
// @route   GET /api/videos/:subtopicId
// @access  Private
export const getVideos = asyncHandler(async (req, res) => {
    try {
        const { subtopicId } = req.params;
        
        // First get the subtopic to get its details
        const subtopic = await Subtopic.findById(subtopicId);
        if (!subtopic) {
            return res.status(404).json({ message: 'Subtopic not found' });
        }

        // Find videos for this subtopic
        const videos = await Video.find({ 
            subName: subtopic.subName,
            topicName: subtopic.topicName,
            chapterName: subtopic.chapterName,
            subtopicName: subtopic.subtopicName
        });
        
        if (videos.length === 0) {
            return res.status(404).json({ message: 'No videos found for this subtopic' });
        }
        
        res.json(videos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @desc    Get quiz for a specific video by videoId or videoUrl
// @route   GET /api/quiz/:videoId?
// @access  Private
export const getQuiz = asyncHandler(async (req, res) => {
    console.log("Fetching quiz for videoId:", req.params.videoId);
    console.log("Fetching quiz for videoUrl query param:", req.query.videoUrl);

    try {
        const { videoId } = req.params;
        const { videoUrl } = req.query;

        let quiz = null;

        if (videoId) {
            console.log("Querying Quiz collection by videoId:", videoId);
            quiz = await Quiz.findOne({ videoId });
            console.log("Quiz query by videoId result:", quiz);
        } else if (videoUrl) {
            console.log("Querying Quiz collection by videoUrl:", videoUrl);
            quiz = await Quiz.findOne({ videoUrl });
            console.log("Quiz query by videoUrl result:", quiz);
        } else {
            return res.status(400).json({ message: 'Please provide either videoId or videoUrl' });
        }

        if (!quiz) {
            console.log('No quiz found for the provided videoId or videoUrl.', { videoId, videoUrl });
            return res.status(404).json({ error: 'Quiz not found' });
        }

        // Return the quiz with all questions
        res.json(quiz);

    } catch (err) {
        console.error('Error in getQuiz:', err);
        res.status(500).json({ error: err.message });
    }
});

// Placeholder admin functions (will need significant changes)
export const postCurriculum = asyncHandler(async (req, res) => {
    res.status(501).json({ message: "Admin postCurriculum not implemented with new schema" });
});

export const postQuiz = asyncHandler(async (req, res) => {
     // This function might be adaptable with the new Quiz model
    res.status(501).json({ message: "Admin postQuiz needs review for new schema" });
});

// @desc    Get curriculum by subject name
// @route   GET /api/curriculum/:subjectName
// @access  Public (or Private if needed)
export const getCurriculumBySubjectName = asyncHandler(async (req, res) => {
    const { subjectName } = req.params;

    try {
        // Find the subject by name
        const subject = await Subject.findOne({ subject: subjectName });

        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        console.log('Found subject:', subject.subject, 'with ID:', subject._id);

        // Fetch all chapters for this subject
        const chapters = await Chapter.find({ subject: subject.subject });
        console.log('Chapters found:', chapters);

        const curriculum = {
            _id: subject._id,
            subjectName: subject.subject,
            board: subject.board,
            grade: subject.grade,
            chapters: []
        };

        for (const chapter of chapters) {
            const topics = await Topic.find({ 
                subjectId: subject._id,
                chapterId: chapter._id 
            });
            
            const chapterData = {
                _id: chapter._id,
                chapterName: chapter.chapterName,
                topics: []
            };

            for (const topic of topics) {
                const subtopics = await Subtopic.find({
                    subName: subject.subject,
                    chapterName: chapter.chapterName,
                    topicName: topic.topicName
                });

                const topicData = {
                    _id: topic._id,
                    topicName: topic.topicName,
                    subtopics: []
                };

                for (const subtopic of subtopics) {
                    const videos = await Video.find({
                        subName: subject.subject,
                        chapterName: chapter.chapterName,
                        topicName: topic.topicName,
                        subtopicName: subtopic.subtopicName
                    });

                    const subtopicData = {
                        _id: subtopic._id,
                        subtopicName: subtopic.subtopicName,
                        videos: videos.map(video => ({
                            _id: video._id,
                            videoUrl: video.videoUrl
                        }))
                    };
                    topicData.subtopics.push(subtopicData);
                }
                chapterData.topics.push(topicData);
            }
            curriculum.chapters.push(chapterData);
        }

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

// @desc    Add video to a subtopic
// @route   POST /api/curriculum/video
// @access  Private/Admin
export const addVideo = asyncHandler(async (req, res) => {
    try {
        const {
            subName,
            chapterName,
            topicName,
            subtopicName,
            videoUrl
        } = req.body;

        // Validate required fields
        if (!subName || !chapterName || !topicName || !subtopicName || !videoUrl) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: subName, chapterName, topicName, subtopicName, videoUrl'
            });
        }

        // Create new video
        const video = new Video({
            subName,
            chapterName,
            topicName,
            subtopicName,
            videoUrl
        });

        const savedVideo = await video.save();

        res.status(201).json({
            success: true,
            message: 'Video added successfully',
            data: savedVideo
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