import Curriculum from '../models/Curriculum.js';
import Quiz from '../models/Quiz.js';
import Result from '../models/Result.js';

export const getSubjects = async (req, res) => {
    try {
        const { board, grade } = req.query;
        const subjects = await Curriculum.find({ board, grade }).select('name');
        res.json(subjects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getCurriculum = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const curriculum = await Curriculum.findById(subjectId);
        if (!curriculum) return res.status(404).json({ error: 'Curriculum not found' });
        res.json(curriculum);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getQuiz = async (req, res) => {
    console.log("Fetching quiz for videoId:", req.params.videoId);
    
    try {
        const { videoId } = req.params;
        const quiz = await Quiz.findOne({ videoId });
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

          // Shuffle questions using Fisher-Yates algorithm
    const shuffledQuestions = [...quiz.questions].sort(() => Math.random() - 0.5);

    // Pick first 10 questions
    const limitedQuestions = shuffledQuestions.slice(0, 10);

    // Return modified quiz with only 10 shuffled questions
    res.json({
      ...quiz.toObject(),
      questions: limitedQuestions,
    });

        // res.json(quiz);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// export const submitQuiz = async (req, res) => {
//     try {
//         const result = new Result(req.body);
//         await result.save();
//         res.status(201).json({ message: 'Quiz submitted successfully' });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };

export const postCurriculum = async (req, res) => {
    try {
        const curriculum = new Curriculum(req.body);
        await curriculum.save();
        res.status(201).json(curriculum);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const postQuiz = async (req, res) => {
    try {
        const quiz = new Quiz(req.body);
        await quiz.save();
        res.status(201).json(quiz);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};