import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Toast from './Toast';

const CurriculumForm = () => {
    const [formData, setFormData] = useState({
        subjectName: '',
        board: '',
        grade: '',
        chapters: [{
            chapterName: '',
            topics: [{
                topicName: '',
                subtopics: [{
                    subtopicName: '',
                    videos: [{
                        videoUrl: '',
                        quiz: {
                            questions: [{
                                que: '',
                                opt: {
                                    a: '',
                                    b: '',
                                    c: '',
                                    d: ''
                                },
                                correctAnswer: '',
                                explanation: ''
                            }]
                        }
                    }]
                }]
            }]
        }]
    });

    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState(null);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const handleInputChange = (path, value) => {
        const keys = path.split('.');
        setFormData(prevData => {
            const newData = { ...prevData };
            let current = newData;
            
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            
            current[keys[keys.length - 1]] = value;
            return newData;
        });
    };

    const addNewItem = (path) => {
        const keys = path.split('.');
        setFormData(prevData => {
            const newData = { ...prevData };
            let current = newData;
            
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            
            const lastKey = keys[keys.length - 1];
            if (!current[lastKey]) {
                current[lastKey] = [];
            }
            
            if (lastKey === 'chapters') {
                current[lastKey].push({
                    chapterName: '',
                    topics: []
                });
            } else if (lastKey === 'topics') {
                current[lastKey].push({
                    topicName: '',
                    subtopics: []
                });
            } else if (lastKey === 'subtopics') {
                current[lastKey].push({
                    subtopicName: '',
                    videos: []
                });
            } else if (lastKey === 'videos') {
                current[lastKey].push({
                    videoUrl: '',
                    quiz: {
                        questions: []
                    }
                });
            } else if (lastKey === 'questions') {
                current[lastKey].push({
                    que: '',
                    opt: {
                        a: '',
                        b: '',
                        c: '',
                        d: ''
                    },
                    correctAnswer: '',
                    explanation: ''
                });
            }
            
            return newData;
        });
    };

    const removeItem = (path, index) => {
        const keys = path.split('.');
        setFormData(prevData => {
            const newData = { ...prevData };
            let current = newData;
            
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            
            const lastKey = keys[keys.length - 1];
            current[lastKey].splice(index, 1);
            
            return newData;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResponse(null);
        setToast(null);

        try {
            const response = await axios.post('http://localhost:5000/api/curriculum/postCurriculumForm', formData);
            setResponse(response.data);
            setToast({
                type: 'success',
                message: 'Curriculum added successfully!'
            });
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to add curriculum. Please try again.';
            setError(err.response?.data || { message: errorMessage });
            setToast({
                type: 'error',
                message: errorMessage
            });
        } finally {
            setLoading(false);
        }
    };

    const isDesktop = windowWidth >= 768; // Tailwind's md breakpoint
    const isSmallDesktop = windowWidth >= 640; // Tailwind's sm breakpoint

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', paddingTop: '2rem', paddingBottom: '2rem' }}>
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
            <div style={{
                maxWidth: isDesktop ? '90%' : '100%',
                marginLeft: 'auto',
                marginRight: 'auto',
                paddingLeft: '1rem',
                paddingRight: '1rem',
                backgroundColor: '#ffffff',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                border: '1px solid #e5e7eb',
                boxSizing: 'border-box'
            }}>
                <div style={{ borderBottom: '1px solid #e5e7eb', padding: '1.5rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '500', color: '#1f2937' }}>Add New Curriculum</h1>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>Fill in the details below to create a new curriculum</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Basic Information */}
                    <div style={{ padding: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: '500', color: '#1f2937', marginBottom: '1rem' }}>Basic Information</h2>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: isDesktop ? 'repeat(3, minmax(0, 1fr))' : 'repeat(1, minmax(0, 1fr))',
                            gap: '1rem'
                        }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Subject Name</label>
                                <input
                                    type="text"
                                    value={formData.subjectName}
                                    onChange={(e) => handleInputChange('subjectName', e.target.value)}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', outline: 'none' }}
                                    required
                                    placeholder="e.g., Mathematics"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Board</label>
                                <input
                                    type="text"
                                    value={formData.board}
                                    onChange={(e) => handleInputChange('board', e.target.value)}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', outline: 'none' }}
                                    required
                                    placeholder="e.g., CBSE"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Grade</label>
                                <input
                                    type="text"
                                    value={formData.grade}
                                    onChange={(e) => handleInputChange('grade', e.target.value)}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', outline: 'none' }}
                                    required
                                    placeholder="e.g., 10"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Chapters */}
                    <div style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: '500', color: '#1f2937' }}>Chapters</h2>
                            <button
                                type="button"
                                onClick={() => addNewItem('chapters')}
                                style={{ display: 'inline-flex', alignItems: 'center', padding: '0.5rem 1rem', border: '1px solid transparent', fontSize: '0.875rem', fontWeight: '500', borderRadius: '0.375rem', color: '#ffffff', cursor: 'pointer', transition: 'background-color 0.2s ease-in-out', backgroundColor: '#2563eb' }}
                            >
                                Add Chapter
                            </button>
                        </div>

                        {formData.chapters.map((chapter, chapterIndex) => (
                            <div key={chapterIndex} style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937' }}>Chapter {chapterIndex + 1}</h3>
                                    <button
                                        type="button"
                                        onClick={() => removeItem('chapters', chapterIndex)}
                                        style={{ color: '#9ca3af', cursor: 'pointer', transition: 'color 0.2s ease-in-out' }}
                                    >
                                        <svg style={{ height: '1.25rem', width: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Chapter Name</label>
                                        <input
                                            type="text"
                                            value={chapter.chapterName}
                                            onChange={(e) => handleInputChange(`chapters.${chapterIndex}.chapterName`, e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', outline: 'none' }}
                                            required
                                            placeholder="e.g., Algebra Basics"
                                        />
                                    </div>

                                    {/* Topics */}
                                    <div style={{ marginTop: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <h4 style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937' }}>Topics</h4>
                                            <button
                                                type="button"
                                                onClick={() => addNewItem(`chapters.${chapterIndex}.topics`)}
                                                style={{ display: 'inline-flex', alignItems: 'center', padding: '0.375rem 0.75rem', border: '1px solid transparent', fontSize: '0.875rem', fontWeight: '500', borderRadius: '0.375rem', color: '#ffffff', cursor: 'pointer', transition: 'background-color 0.2s ease-in-out', backgroundColor: '#10b981' }}
                                            >
                                                Add Topic
                                            </button>
                                        </div>

                                        {chapter.topics.map((topic, topicIndex) => (
                                            <div key={topicIndex} style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', marginBottom: '1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                    <h5 style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937' }}>Topic {topicIndex + 1}</h5>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(`chapters.${chapterIndex}.topics`, topicIndex)}
                                                        style={{ color: '#9ca3af', cursor: 'pointer', transition: 'color 0.2s ease-in-out' }}
                                                    >
                                                        <svg style={{ height: '1.25rem', width: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                <div style={{ marginBottom: '1rem' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Topic Name</label>
                                                        <input
                                                            type="text"
                                                            value={topic.topicName}
                                                            onChange={(e) => handleInputChange(`chapters.${chapterIndex}.topics.${topicIndex}.topicName`, e.target.value)}
                                                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', outline: 'none' }}
                                                            required
                                                            placeholder="e.g., Linear Equations"
                                                        />
                                                    </div>

                                                    {/* Subtopics */}
                                                    <div style={{ marginTop: '1rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                            <h5 style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937' }}>Subtopics</h5>
                                                            <button
                                                                type="button"
                                                                onClick={() => addNewItem(`chapters.${chapterIndex}.topics.${topicIndex}.subtopics`)}
                                                                style={{ display: 'inline-flex', alignItems: 'center', padding: '0.375rem 0.75rem', border: '1px solid transparent', fontSize: '0.875rem', fontWeight: '500', borderRadius: '0.375rem', color: '#ffffff', cursor: 'pointer', transition: 'background-color 0.2s ease-in-out', backgroundColor: '#7c3aed' }}
                                                            >
                                                                Add Subtopic
                                                            </button>
                                                        </div>

                                                        {topic.subtopics.map((subtopic, subtopicIndex) => (
                                                            <div key={subtopicIndex} style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', marginBottom: '1rem' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                                    <h6 style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937' }}>Subtopic {subtopicIndex + 1}</h6>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeItem(`chapters.${chapterIndex}.topics.${topicIndex}.subtopics`, subtopicIndex)}
                                                                        style={{ color: '#9ca3af', cursor: 'pointer', transition: 'color 0.2s ease-in-out' }}
                                                                    >
                                                                        <svg style={{ height: '1.25rem', width: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                    </button>
                                                                </div>

                                                                <div style={{ marginBottom: '1rem' }}>
                                                                    <div>
                                                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Subtopic Name</label>
                                                                        <input
                                                                            type="text"
                                                                            value={subtopic.subtopicName}
                                                                            onChange={(e) => handleInputChange(`chapters.${chapterIndex}.topics.${topicIndex}.subtopics.${subtopicIndex}.subtopicName`, e.target.value)}
                                                                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', outline: 'none' }}
                                                                            required
                                                                            placeholder="e.g., Solving Linear Equations"
                                                                        />
                                                                    </div>

                                                                    {/* Videos */}
                                                                    <div style={{ marginTop: '1rem' }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                                            <h6 style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937' }}>Videos</h6>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => addNewItem(`chapters.${chapterIndex}.topics.${topicIndex}.subtopics.${subtopicIndex}.videos`)}
                                                                                style={{ display: 'inline-flex', alignItems: 'center', padding: '0.375rem 0.75rem', border: '1px solid transparent', fontSize: '0.875rem', fontWeight: '500', borderRadius: '0.375rem', color: '#ffffff', cursor: 'pointer', transition: 'background-color 0.2s ease-in-out', backgroundColor: '#d97706' }}
                                                                            >
                                                                                Add Video
                                                                            </button>
                                                                        </div>

                                                                        {subtopic.videos.map((video, videoIndex) => (
                                                                            <div key={videoIndex} style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', marginBottom: '1rem' }}>
                                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                                                    <h6 style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937' }}>Video {videoIndex + 1}</h6>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => removeItem(`chapters.${chapterIndex}.topics.${topicIndex}.subtopics.${subtopicIndex}.videos`, videoIndex)}
                                                                                        style={{ color: '#9ca3af', cursor: 'pointer', transition: 'color 0.2s ease-in-out' }}
                                                                                    >
                                                                                        <svg style={{ height: '1.25rem', width: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                                        </svg>
                                                                                    </button>
                                                                                </div>

                                                                                <div style={{ marginBottom: '1rem' }}>
                                                                                    <div>
                                                                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Video URL</label>
                                                                                        <input
                                                                                            type="text"
                                                                                            value={video.videoUrl}
                                                                                            onChange={(e) => handleInputChange(`chapters.${chapterIndex}.topics.${topicIndex}.subtopics.${subtopicIndex}.videos.${videoIndex}.videoUrl`, e.target.value)}
                                                                                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', outline: 'none' }}
                                                                                            required
                                                                                            placeholder="e.g., https://youtu.be/example"
                                                                                        />
                                                                                    </div>

                                                                                    {/* Quiz */}
                                                                                    <div style={{ marginTop: '1rem' }}>
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                                                            <h6 style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937' }}>Quiz Questions</h6>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => addNewItem(`chapters.${chapterIndex}.topics.${topicIndex}.subtopics.${subtopicIndex}.videos.${videoIndex}.quiz.questions`)}
                                                                                                style={{ display: 'inline-flex', alignItems: 'center', padding: '0.375rem 0.75rem', border: '1px solid transparent', fontSize: '0.875rem', fontWeight: '500', borderRadius: '0.375rem', color: '#ffffff', cursor: 'pointer', transition: 'background-color 0.2s ease-in-out', backgroundColor: '#4f46e5' }}
                                                                                            >
                                                                                                Add Question
                                                                                            </button>
                                                                                        </div>

                                                                                        {video.quiz.questions.map((question, questionIndex) => (
                                                                                            <div key={questionIndex} style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', marginBottom: '1rem' }}>
                                                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                                                                    <h6 style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937' }}>Question {questionIndex + 1}</h6>
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => removeItem(`chapters.${chapterIndex}.topics.${topicIndex}.subtopics.${subtopicIndex}.videos.${videoIndex}.quiz.questions`, questionIndex)}
                                                                                                        style={{ color: '#9ca3af', cursor: 'pointer', transition: 'color 0.2s ease-in-out' }}
                                                                                                    >
                                                                                                        <svg style={{ height: '1.25rem', width: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                                                        </svg>
                                                                                                    </button>
                                                                                                </div>

                                                                                                <div style={{ marginBottom: '1rem' }}>
                                                                                                    <div>
                                                                                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Question</label>
                                                                                                        <input
                                                                                                            type="text"
                                                                                                            value={question.que}
                                                                                                            onChange={(e) => handleInputChange(`chapters.${chapterIndex}.topics.${topicIndex}.subtopics.${subtopicIndex}.videos.${videoIndex}.quiz.questions.${questionIndex}.que`, e.target.value)}
                                                                                                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', outline: 'none' }}
                                                                                                            placeholder="Enter your question"
                                                                                                        />
                                                                                                    </div>

                                                                                                    <div style={{
                                                                                                        display: 'grid',
                                                                                                        gridTemplateColumns: isSmallDesktop ? 'repeat(2, minmax(0, 1fr))' : 'repeat(1, minmax(0, 1fr))',
                                                                                                        gap: '1rem'
                                                                                                    }}>
                                                                                                        <div>
                                                                                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Option A</label>
                                                                                                            <input
                                                                                                                type="text"
                                                                                                                value={question.opt.a}
                                                                                                                onChange={(e) => handleInputChange(`chapters.${chapterIndex}.topics.${topicIndex}.subtopics.${subtopicIndex}.videos.${videoIndex}.quiz.questions.${questionIndex}.opt.a`, e.target.value)}
                                                                                                                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', outline: 'none' }}
                                                                                                                placeholder="Option A"
                                                                                                            />
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Option B</label>
                                                                                                            <input
                                                                                                                type="text"
                                                                                                                value={question.opt.b}
                                                                                                                onChange={(e) => handleInputChange(`chapters.${chapterIndex}.topics.${topicIndex}.subtopics.${subtopicIndex}.videos.${videoIndex}.quiz.questions.${questionIndex}.opt.b`, e.target.value)}
                                                                                                                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', outline: 'none' }}
                                                                                                                placeholder="Option B"
                                                                                                            />
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Option C</label>
                                                                                                            <input
                                                                                                                type="text"
                                                                                                                value={question.opt.c}
                                                                                                                onChange={(e) => handleInputChange(`chapters.${chapterIndex}.topics.${topicIndex}.subtopics.${subtopicIndex}.videos.${videoIndex}.quiz.questions.${questionIndex}.opt.c`, e.target.value)}
                                                                                                                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', outline: 'none' }}
                                                                                                                placeholder="Option C"
                                                                                                            />
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Option D</label>
                                                                                                            <input
                                                                                                                type="text"
                                                                                                                value={question.opt.d}
                                                                                                                onChange={(e) => handleInputChange(`chapters.${chapterIndex}.topics.${topicIndex}.subtopics.${subtopicIndex}.videos.${videoIndex}.quiz.questions.${questionIndex}.opt.d`, e.target.value)}
                                                                                                                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', outline: 'none' }}
                                                                                                                placeholder="Option D"
                                                                                                            />
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    <div style={{ marginTop: '1rem' }}>
                                                                                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Correct Answer</label>
                                                                                                        <select
                                                                                                            value={question.correctAnswer}
                                                                                                            onChange={(e) => handleInputChange(`chapters.${chapterIndex}.topics.${topicIndex}.subtopics.${subtopicIndex}.videos.${videoIndex}.quiz.questions.${questionIndex}.correctAnswer`, e.target.value)}
                                                                                                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', outline: 'none' }}
                                                                                                        >
                                                                                                            <option value="">Select correct answer</option>
                                                                                                            <option value="a">A</option>
                                                                                                            <option value="b">B</option>
                                                                                                            <option value="c">C</option>
                                                                                                            <option value="d">D</option>
                                                                                                        </select>
                                                                                                    </div>

                                                                                                    <div style={{ marginTop: '1rem' }}>
                                                                                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Explanation</label>
                                                                                                        <textarea
                                                                                                            value={question.explanation}
                                                                                                            onChange={(e) => handleInputChange(`chapters.${chapterIndex}.topics.${topicIndex}.subtopics.${subtopicIndex}.videos.${videoIndex}.quiz.questions.${questionIndex}.explanation`, e.target.value)}
                                                                                                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', outline: 'none' }}
                                                                                                            rows="3"
                                                                                                            placeholder="Enter explanation for the correct answer"
                                                                                                        />
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{ width: '100%', backgroundColor: '#2563eb', color: '#ffffff', paddingTop: '0.75rem', paddingBottom: '0.75rem', paddingLeft: '1.5rem', paddingRight: '1.5rem', borderRadius: '0.375rem', cursor: 'pointer', transition: 'background-color 0.2s ease-in-out', fontWeight: '500', fontSize: '1rem' }}
                        >
                            {loading ? 'Submitting...' : 'Submit Curriculum'}
                        </button>
                    </div>
                </form>

                {response && (
                    <div style={{ padding: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                        <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '0.5rem', padding: '1rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#065f46', marginBottom: '0.5rem' }}>Success Response:</h3>
                            <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#ffffff', padding: '1rem', borderRadius: '0.25rem', border: '1px solid #a7f3d0', fontSize: '0.875rem' }}>{JSON.stringify(response, null, 2)}</pre>
                        </div>
                    </div>
                )}

                {error && (
                    <div style={{ padding: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '1rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#991b1b', marginBottom: '0.5rem' }}>Error:</h3>
                            <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#ffffff', padding: '1rem', borderRadius: '0.25rem', border: '1px solid #fecaca', fontSize: '0.875rem' }}>{JSON.stringify(error, null, 2)}</pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CurriculumForm; 