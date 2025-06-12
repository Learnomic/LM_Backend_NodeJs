import { body, validationResult } from 'express-validator';

export const validateCurriculumForm = [
    // Subject level validation
    body('subjectName').trim().notEmpty().withMessage('Subject name is required'),
    body('board').trim().notEmpty().withMessage('Board is required'),
    body('grade').trim().notEmpty().withMessage('Grade is required'),
    
    // Chapters validation
    body('chapters').isArray().withMessage('Chapters must be an array'),
    body('chapters.*.chapterName').trim().notEmpty().withMessage('Chapter name is required'),
    
    // Topics validation
    body('chapters.*.topics').isArray().withMessage('Topics must be an array'),
    body('chapters.*.topics.*.topicName').trim().notEmpty().withMessage('Topic name is required'),
    
    // Subtopics validation
    body('chapters.*.topics.*.subtopics').isArray().withMessage('Subtopics must be an array'),
    body('chapters.*.topics.*.subtopics.*.subtopicName').trim().notEmpty().withMessage('Subtopic name is required'),
    
    // Videos validation
    body('chapters.*.topics.*.subtopics.*.videos').isArray().withMessage('Videos must be an array'),
    body('chapters.*.topics.*.subtopics.*.videos.*.videoUrl').trim().notEmpty().withMessage('Video URL is required'),
    
    // Quiz validation (optional)
    body('chapters.*.topics.*.subtopics.*.videos.*.quiz').optional(),
    body('chapters.*.topics.*.subtopics.*.videos.*.quiz.questions').optional().isArray(),
    body('chapters.*.topics.*.subtopics.*.videos.*.quiz.questions.*.que').optional().trim().notEmpty().withMessage('Question text is required'),
    body('chapters.*.topics.*.subtopics.*.videos.*.quiz.questions.*.opt').optional().isObject(),
    body('chapters.*.topics.*.subtopics.*.videos.*.quiz.questions.*.opt.a').optional().trim(),
    body('chapters.*.topics.*.subtopics.*.videos.*.quiz.questions.*.opt.b').optional().trim(),
    body('chapters.*.topics.*.subtopics.*.videos.*.quiz.questions.*.opt.c').optional().trim(),
    body('chapters.*.topics.*.subtopics.*.videos.*.quiz.questions.*.opt.d').optional().trim(),
    body('chapters.*.topics.*.subtopics.*.videos.*.quiz.questions.*.correctAnswer').optional().trim().notEmpty().withMessage('Correct answer is required'),
    body('chapters.*.topics.*.subtopics.*.videos.*.quiz.questions.*.explanation').optional().trim(),

    // Validation result handler
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }
        next();
    }
]; 