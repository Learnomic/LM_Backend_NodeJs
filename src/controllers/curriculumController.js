// import Subject from '../models/Subject.js';
// import Chapter from '../models/Chapter.js';
// import Topic from '../models/Topic.js';
// import Subtopic from '../models/Subtopic.js';
// import Video from '../models/Video.js';
// import Quiz from '../models/Quiz.js';
// import asyncHandler from 'express-async-handler';
// // import Result from '../models/Result.js'; // Assuming QuizScore replaces Result
// // import Curriculum from '../models/Curriculum.js'; // Old model

// // @desc    Get complete curriculum content for user's board and grade
// // @route   GET /api/content
// // @access  Private (assuming content is protected)
// export const getCompleteContent = asyncHandler(async (req, res) => {
//     try {
//         // Get board and grade from authenticated user
//         const { board, grade } = req.user;

//         // Find the subject for the user's board and grade
//         const subject = await Subject.findOne({ board: board, grade: grade });

//         if (!subject) {
//             return res.status(404).json({ message: 'Subject not found for this board and grade' });
//         }

//         const subjectId = subject._id;

//         // Fetch all chapters for this subject
//         const chapters = await Chapter.find({ subject: subject.subject }).lean();

//         // Iterate through chapters and fetch nested data
//         for (const chapter of chapters) {
//             // Fetch topics for the current chapter
//             chapter.topics = await Topic.find({ 
//                 subjectId: subjectId,
//                 chapterId: chapter._id 
//             }).lean();

//             // Iterate through topics and fetch nested data
//             for (const topic of chapter.topics) {
//                 // Fetch subtopics for the current topic
//                 topic.subtopics = await Subtopic.find({ 
//                     subName: subject.subject,
//                     chapterName: chapter.chapterName,
//                     topicName: topic.topicName
//                 }).lean();

//                 // Iterate through subtopics and fetch nested data
//                 for (const subtopic of topic.subtopics) {
//                     // Fetch videos for the current subtopic
//                     subtopic.videos = await Video.find({ 
//                         subName: subject.subject,
//                         topicName: topic.topicName,
//                         chapterName: chapter.chapterName,
//                         subtopicName: subtopic.subtopicName
//                     }).lean();
//                 }
//             }
//         }

//         // Structure the response
//         const completeContent = {
//             _id: subject._id,
//             subject: subject.subject,
//             board: subject.board,
//             grade: subject.grade,
//             chapters: chapters
//         };

//         res.json(completeContent);

//     } catch (err) {
//         console.error('Error fetching complete curriculum content:', err);
//         res.status(500).json({ error: err.message });
//     }
// });

// // @desc    Get all subjects
// // @route   GET /api/subjects
// // @access  Private
// export const getSubjects = asyncHandler(async (req, res) => {
//     try {
//         // Get board and grade from query parameters (optional)
//         const { board, grade } = req.query;

//         console.log('Searching for subjects with:', { board, grade });

//         let query = {};

//         // Build query based on provided parameters
//         if (board) {
//             query.board = board;
//         }
//         if (grade) {
//              query.$or = [
//                 { grade: grade },
//                 { grade: grade.toString() } // Handle both string and number grades
//             ];
//         }

//         // Find subjects matching the criteria
//         const subjects = await Subject.find(query);

//         console.log('Found subjects:', subjects);

//         if (!subjects || subjects.length === 0) {
//             // If filters were applied and no subjects found, indicate that.
//             if (board || grade) {
//                  return res.status(404).json({
//                      message: 'No subjects found for the specified board and grade',
//                      query: { board, grade }
//                  });
//             } else {
//                  // If no filters were applied and no subjects found at all.
//                  return res.status(404).json({
//                      message: 'No subjects found in the database'
//                  });
//             }
//         }

//         res.json(subjects);
//     } catch (err) {
//         console.error('Error in getSubjects:', err);
//         res.status(500).json({ 
//             error: err.message,
//             message: 'Error fetching subjects'
//         });
//     }
// });

// // @desc    Get chapters for a specific subject
// // @route   GET /api/chapters/:subjectName
// // @access  Private
// export const getChapters = asyncHandler(async (req, res) => {
//     try {
//         const { subjectName } = req.params;
        
//         // Find chapters for this subject using subject name
//         const chapters = await Chapter.find({ subject: subjectName });
        
//         if (chapters.length === 0) {
//             return res.status(404).json({ message: 'No chapters found for this subject' });
//         }
        
//         res.json(chapters);
//     } catch (err) {
//         console.error('Error in getChapters:', err);
//         res.status(500).json({ error: err.message });
//     }
// });

// // @desc    Get topics for a specific chapter
// // @route   GET /api/topics/:chapterId
// // @access  Private
// export const getTopics = asyncHandler(async (req, res) => {
//     try {
//         const { chapterId } = req.params;
        
//         console.log('Attempting to get topics for chapterId:', chapterId);

//         // Find the chapter to get its subject name
//         const chapter = await Chapter.findById(chapterId);
//         if (!chapter) {
//             console.log('Chapter not found for chapterId:', chapterId);
//             return res.status(404).json({ message: 'Chapter not found' });
//         }

//         console.log('Found chapter:', chapter);

//         // Find the corresponding Subject document using the subject name from the chapter
//         const subject = await Subject.findOne({ subject: chapter.subject });
//         if (!subject) {
//              // This case might indicate inconsistent data, but handling it to prevent errors
//              console.warn(`Subject document not found for subject name: ${chapter.subject} from chapter ID: ${chapterId}`);
//              return res.status(404).json({ message: 'Corresponding subject not found for this chapter' });
//         }

//         console.log('Found subject for chapter subject name:', subject);

//         // Find topics for this chapter using both chapter and subject IDs
//         const query = { 
//             chapterId: chapter._id,
//             subjectId: subject._id // Use subject._id from the found Subject document
//         };
//         console.log('Querying Topics with:', query);
        
//         const topics = await Topic.find(query);
        
//         console.log('Found topics:', topics);

//         if (topics.length === 0) {
//             console.log('No topics found for this chapter with the constructed query.', query);
//             return res.status(404).json({ message: 'No topics found for this chapter' });
//         }
        
//         res.json(topics);
//     } catch (err) {
//         console.error('Error in getTopics:', err);
//         res.status(500).json({ error: err.message });
//     }
// });

// // @desc    Get subtopics for a specific topic
// // @route   GET /api/subtopics/:topicId
// // @access  Private
// export const getSubtopics = asyncHandler(async (req, res) => {
//     try {
//         const { topicId } = req.params;
        
//         // First get the topic to get its details
//         const topic = await Topic.findById(topicId);
//         if (!topic) {
//             return res.status(404).json({ message: 'Topic not found' });
//         }

//         // Get chapter details
//         const chapter = await Chapter.findById(topic.chapterId);
//         if (!chapter) {
//             return res.status(404).json({ message: 'Chapter not found' });
//         }

//         // Find subtopics for this topic
//         const subtopics = await Subtopic.find({ 
//             subName: chapter.subject,
//             chapterName: chapter.chapterName,
//             topicName: topic.topicName
//         });
        
//         if (subtopics.length === 0) {
//             return res.status(404).json({ message: 'No subtopics found for this topic' });
//         }
        
//         res.json(subtopics);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

// // @desc    Get videos for a specific subtopic
// // @route   GET /api/videos/:subtopicId
// // @access  Private
// export const getVideos = asyncHandler(async (req, res) => {
//     try {
//         const { subtopicId } = req.params;
        
//         // First get the subtopic to get its details
//         const subtopic = await Subtopic.findById(subtopicId);
//         if (!subtopic) {
//             return res.status(404).json({ message: 'Subtopic not found' });
//         }

//         // Find videos for this subtopic
//         const videos = await Video.find({ 
//             subName: subtopic.subName,
//             topicName: subtopic.topicName,
//             chapterName: subtopic.chapterName,
//             subtopicName: subtopic.subtopicName
//         });
        
//         if (videos.length === 0) {
//             return res.status(404).json({ message: 'No videos found for this subtopic' });
//         }
        
//         res.json(videos);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

// // @desc    Get quiz for a specific video by videoId or videoUrl
// // @route   GET /api/quiz/:videoId?
// // @access  Private
// export const getQuiz = asyncHandler(async (req, res) => {
//     console.log("Fetching quiz for videoId:", req.params.videoId);
//     console.log("Fetching quiz for videoUrl query param:", req.query.videoUrl);

//     try {
//         const { videoId } = req.params;
//         const { videoUrl } = req.query;

//         let quiz = null;

//         if (videoId) {
//             console.log("Querying Quiz collection by videoId:", videoId);
//             quiz = await Quiz.findOne({ videoId });
//             console.log("Quiz query by videoId result:", quiz);
//         } else if (videoUrl) {
//             console.log("Querying Quiz collection by videoUrl:", videoUrl);
//             quiz = await Quiz.findOne({ videoUrl });
//             console.log("Quiz query by videoUrl result:", quiz);
//         } else {
//             return res.status(400).json({ message: 'Please provide either videoId or videoUrl' });
//         }

//         if (!quiz) {
//             console.log('No quiz found for the provided videoId or videoUrl.', { videoId, videoUrl });
//             return res.status(404).json({ error: 'Quiz not found' });
//         }

//         // Return the quiz with all questions
//         res.json(quiz);

//     } catch (err) {
//         console.error('Error in getQuiz:', err);
//         res.status(500).json({ error: err.message });
//     }
// });

// // Placeholder admin functions (will need significant changes)
// export const postCurriculum = asyncHandler(async (req, res) => {
//     res.status(501).json({ message: "Admin postCurriculum not implemented with new schema" });
// });

// export const postQuiz = asyncHandler(async (req, res) => {
//      // This function might be adaptable with the new Quiz model
//     res.status(501).json({ message: "Admin postQuiz needs review for new schema" });
// });

// // @desc    Get curriculum by subject name
// // @route   GET /api/curriculum/:subjectName
// // @access  Public (or Private if needed)
// export const getCurriculumBySubjectName = asyncHandler(async (req, res) => {
//     const { subjectName } = req.params;

//     try {
//         // Find the subject by name
//         const subject = await Subject.findOne({ subject: subjectName });

//         if (!subject) {
//             return res.status(404).json({ message: 'Subject not found' });
//         }

//         console.log('Found subject:', subject.subject, 'with ID:', subject._id);

//         // Fetch all chapters for this subject
//         const chapters = await Chapter.find({ subject: subject.subject });
//         console.log('Chapters found:', chapters);

//         const curriculum = {
//             _id: subject._id,
//             subjectName: subject.subject,
//             board: subject.board,
//             grade: subject.grade,
//             chapters: []
//         };

//         for (const chapter of chapters) {
//             const topics = await Topic.find({ 
//                 subjectId: subject._id,
//                 chapterId: chapter._id 
//             });
            
//             const chapterData = {
//                 _id: chapter._id,
//                 chapterName: chapter.chapterName,
//                 topics: []
//             };

//             for (const topic of topics) {
//                 const subtopics = await Subtopic.find({
//                     subName: subject.subject,
//                     chapterName: chapter.chapterName,
//                     topicName: topic.topicName
//                 });

//                 const topicData = {
//                     _id: topic._id,
//                     topicName: topic.topicName,
//                     subtopics: []
//                 };

//                 for (const subtopic of subtopics) {
//                     const videos = await Video.find({
//                         subName: subject.subject,
//                         chapterName: chapter.chapterName,
//                         topicName: topic.topicName,
//                         subtopicName: subtopic.subtopicName
//                     });

//                     const subtopicData = {
//                         _id: subtopic._id,
//                         subtopicName: subtopic.subtopicName,
//                         videos: videos.map(video => ({
//                             _id: video._id,
//                             videoUrl: video.videoUrl
//                         }))
//                     };
//                     topicData.subtopics.push(subtopicData);
//                 }
//                 chapterData.topics.push(topicData);
//             }
//             curriculum.chapters.push(chapterData);
//         }

//         res.status(200).json({
//             success: true,
//             data: curriculum
//         });

//     } catch (error) {
//         console.error('Error fetching curriculum:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to fetch curriculum',
//             error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
//         });
//     }
// });

// // @desc    Add video to a subtopic
// // @route   POST /api/curriculum/video
// // @access  Private/Admin
// export const addVideo = asyncHandler(async (req, res) => {
//     try {
//         const {
//             subName,
//             chapterName,
//             topicName,
//             subtopicName,
//             videoUrl
//         } = req.body;

//         // Validate required fields
//         if (!subName || !chapterName || !topicName || !subtopicName || !videoUrl) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Please provide all required fields: subName, chapterName, topicName, subtopicName, videoUrl'
//             });
//         }

//         // Create new video
//         const video = new Video({
//             subName,
//             chapterName,
//             topicName,
//             subtopicName,
//             videoUrl
//         });

//         const savedVideo = await video.save();

//         res.status(201).json({
//             success: true,
//             message: 'Video added successfully',
//             data: savedVideo
//         });

//     } catch (error) {
//         console.error('Error adding video:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to add video',
//             error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
//         });
//     }
// });

// // @desc    Get video by ID
// // @route   GET /api/curriculum/video/:videoId
// // @access  Private
// export const getVideoById = asyncHandler(async (req, res) => {
//     try {
//         const { videoId } = req.params;
        
//         // Find the video by ID
//         const video = await Video.findById(videoId);
//         if (!video) {
//             return res.status(404).json({ 
//                 success: false,
//                 message: 'Video not found' 
//             });
//         }

//         // Get the subject information
//         const subject = await Subject.findOne({ subject: video.subName });
        
//         // Prepare the response
//         const response = {
//             success: true,
//             data: {
//                 _id: video._id,
//                 title: video.title,
//                 videoUrl: video.videoUrl,
//                 subName: video.subName,
//                 chapterName: video.chapterName,
//                 topicName: video.topicName,
//                 subtopicName: video.subtopicName,
//                 subject: subject ? {
//                     _id: subject._id,
//                     name: subject.subject,
//                     board: subject.board,
//                     grade: subject.grade
//                 } : null
//             }
//         };

//         res.json(response);
//     } catch (err) {
//         console.error('Error in getVideoById:', err);
//         res.status(500).json({ 
//             success: false,
//             message: 'Error fetching video',
//             error: err.message 
//         });
//     }
// });

// export const postCurriculumForm = asyncHandler(async (req, res) => {
//     try {
//         const {
//             subjectName,
//             board,
//             grade,
//             chapters
//         } = req.body;

//         console.log('Received data:', JSON.stringify(req.body, null, 2));

//         // Validate required fields
//         if (!subjectName || !board || !grade || !chapters || !Array.isArray(chapters)) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Subject name, board, grade, and chapters array are required'
//             });
//         }

//         // Check if subject already exists, if not create it
//         let subject = await Subject.findOne({ 
//             subject: subjectName,
//             board: board,
//             grade: grade.toString()
//         });
        
//         if (!subject) {
//             subject = new Subject({
//                 subject: subjectName,
//                 board: board,
//                 grade: grade.toString()
//             });
//             await subject.save();
//             console.log('Created new subject:', subject);
//         }

//         // Process each chapter and collect all created data
//         const processedChapters = [];
//         let totalQuestions = 0;
//         let totalVideos = 0;
//         let allQuestions = [];
//         let firstVideoUrl = null;
//         let firstVideoId = null;
//         let firstChapterName = null;
//         let firstTopicName = null;
//         let firstSubtopicName = null;

//         for (const chapterData of chapters) {
//             const { chapterName, topics } = chapterData;

//             if (!chapterName || !topics || !Array.isArray(topics)) {
//                 console.log('Skipping invalid chapter:', chapterName);
//                 continue;
//             }

//             // Check if chapter exists, if not create it
//             let chapter = await Chapter.findOne({ 
//                 subject: subjectName, 
//                 chapterName: chapterName
//             });
            
//             if (!chapter) {
//                 chapter = new Chapter({
//                     subject: subjectName,
//                     chapterName: chapterName
//                 });
//                 await chapter.save();
//                 console.log('Created new chapter:', chapter);
//             }

//             // Set first chapter name
//             if (!firstChapterName) {
//                 firstChapterName = chapter.chapterName;
//             }

//             // Process each topic
//             for (const topicData of topics) {
//                 const { topicName, subtopics } = topicData;

//                 if (!topicName || !subtopics || !Array.isArray(subtopics)) {
//                     console.log('Skipping invalid topic:', topicName);
//                     continue;
//                 }

//                 // Check if topic exists, if not create it
//                 let topic = await Topic.findOne({ 
//                     subjectId: subject._id,
//                     chapterId: chapter._id,
//                     topicName: topicName
//                 });

//                 if (!topic) {
//                     topic = new Topic({
//                         subjectId: subject._id,
//                         chapterId: chapter._id,
//                         topicName: topicName
//                     });
//                     await topic.save();
//                     console.log('Created new topic:', topic);
//                 }

//                 // Set first topic name
//                 if (!firstTopicName) {
//                     firstTopicName = topic.topicName;
//                 }

//                 // Process each subtopic
//                 for (const subtopicData of subtopics) {
//                     const { subtopicName, videos } = subtopicData;

//                     if (!subtopicName || !videos || !Array.isArray(videos)) {
//                         console.log('Skipping invalid subtopic:', subtopicName);
//                         continue;
//                     }

//                     // Check if subtopic exists, if not create it
//                     let subtopic = await Subtopic.findOne({
//                         subName: subjectName,
//                         chapterName: chapterName,
//                         topicName: topicName,
//                         subtopicName: subtopicName
//                     });

//                     if (!subtopic) {
//                         subtopic = new Subtopic({
//                             subName: subjectName,
//                             chapterName: chapterName,
//                             topicName: topicName,
//                             subtopicName: subtopicName
//                         });
//                         await subtopic.save();
//                         console.log('Created new subtopic:', subtopic);
//                     }

//                     // Set first subtopic name
//                     if (!firstSubtopicName) {
//                         firstSubtopicName = subtopic.subtopicName;
//                     }

//                     // Process each video
//                     for (const videoData of videos) {
//                         const { videoUrl, quiz } = videoData;

//                         if (!videoUrl) {
//                             console.log('Skipping video without URL');
//                             continue;
//                         }

//                         // Check if video exists, if not create it
//                         let video = await Video.findOne({
//                             subName: subjectName,
//                             chapterName: chapterName,
//                             topicName: topicName,
//                             subtopicName: subtopicName,
//                             videoUrl: videoUrl
//                         });

//                         if (!video) {
//                             video = new Video({
//                                 subName: subjectName,
//                                 chapterName: chapterName,
//                                 topicName: topicName,
//                                 subtopicName: subtopicName,
//                                 videoUrl: videoUrl
//                             });
//                             await video.save();
//                             console.log('Created new video:', video);
//                         }

//                         totalVideos++;

//                         // Set first video details
//                         if (!firstVideoUrl) {
//                             firstVideoUrl = video.videoUrl;
//                             firstVideoId = video._id.toString();
//                         }

//                         // Process quiz if provided
//                         if (quiz && quiz.questions && Array.isArray(quiz.questions) && quiz.questions.length > 0) {
//                             // Filter out empty questions
//                             const validQuestions = quiz.questions.filter(q => 
//                                 q.que && q.que.trim() !== '' && q.correctAnswer
//                             );

//                             if (validQuestions.length > 0) {
//                                 // Check if quiz exists, if not create it
//                                 let existingQuiz = await Quiz.findOne({
//                                     videoId: video._id.toString(),
//                                     videoUrl: videoUrl
//                                 });

//                                 if (!existingQuiz) {
//                                     const processedQuestions = validQuestions.map(q => ({
//                                         que: q.que,
//                                         opt: {
//                                             a: q.opt?.a || '',
//                                             b: q.opt?.b || '',
//                                             c: q.opt?.c || '',
//                                             d: q.opt?.d || ''
//                                         },
//                                         correctAnswer: q.correctAnswer,
//                                         explanation: q.explanation || ''
//                                     }));

//                                     const newQuiz = new Quiz({
//                                         videoId: video._id.toString(),
//                                         videoUrl: videoUrl,
//                                         questions: processedQuestions
//                                     });
//                                     await newQuiz.save();
//                                     console.log('Created new quiz:', newQuiz);
                                    
//                                     totalQuestions += newQuiz.questions.length;
                                    
//                                     // Add questions with _id FIRST, then other properties
//                                     const questionsWithId = newQuiz.questions.map(q => ({
//                                         _id: q._id,
//                                         que: q.que,
//                                         opt: q.opt,
//                                         correctAnswer: q.correctAnswer,
//                                         explanation: q.explanation
//                                     }));
//                                     allQuestions = allQuestions.concat(questionsWithId);
//                                 } else {
//                                     totalQuestions += existingQuiz.questions.length;
                                    
//                                     // Add existing questions with _id FIRST, then other properties
//                                     const questionsWithId = existingQuiz.questions.map(q => ({
//                                         _id: q._id,
//                                         que: q.que,
//                                         opt: q.opt,
//                                         correctAnswer: q.correctAnswer,
//                                         explanation: q.explanation
//                                     }));
//                                     allQuestions = allQuestions.concat(questionsWithId);
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }

//             processedChapters.push({
//                 id: chapter._id,
//                 chapterName: chapter.chapterName
//             });
//         }

//         // Select first 10 questions for response (matching the expected format)
//         const selectedQuestions = allQuestions.slice(0, 10);
//         const selectedQuestionsCount = Math.min(totalQuestions, 10);

//         // Format response according to the desired JSON structure
//         const responseData = {
//             success: true,
//             data: {
//                 _id: subject._id,
//                 videoUrl: firstVideoUrl || "Multiple videos processed",
//                 videoId: firstVideoId || subject._id.toString(),
//                 questions: selectedQuestions,
//                 totalQuestions: totalQuestions,
//                 selectedQuestionsCount: selectedQuestionsCount,
//                 subject: {
//                     name: subject.subject,
//                     chapterName: firstChapterName || "Multiple Chapters",
//                     topicName: firstTopicName || "Multiple Topics",
//                     subtopicName: firstSubtopicName || "Multiple Subtopics"
//                 }
//             }
//         };

//         res.status(201).json(responseData);

//     } catch (error) {
//         console.error('Error creating curriculum:', error);
//         console.error('Stack trace:', error.stack);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to create curriculum',
//             error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
//         });
//     }
// });

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