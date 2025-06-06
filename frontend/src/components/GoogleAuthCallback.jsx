import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './GoogleAuthCallback.css';

const GoogleAuthCallback = () => {
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Get token from URL
                const urlParams = new URLSearchParams(window.location.search);
                const token = urlParams.get('token');

                if (token) {
                    // Store token in localStorage
                    localStorage.setItem('authToken', token);
                    
                    // Fetch user profile
                    const response = await fetch('http://localhost:5000/api/auth/profile', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // Store user data
                        localStorage.setItem('user', JSON.stringify(data.user));
                        // Redirect to dashboard or home page
                        navigate('/dashboard');
                    } else {
                        throw new Error(data.message);
                    }
                } else {
                    throw new Error('No token received');
                }
            } catch (error) {
                setError(error.message);
                // Redirect to login page after 3 seconds
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            }
        };

        handleCallback();
    }, [navigate]);

    if (error) {
        return (
            <div className="auth-callback-container error">
                <h2>Authentication Error</h2>
                <p>{error}</p>
                <p>Redirecting to login page...</p>
            </div>
        );
    }

    return (
        <div className="auth-callback-container">
            <div className="loading-spinner"></div>
            <h2>Processing Login...</h2>
            <p>Please wait while we complete your authentication.</p>
        </div>
    );
};

export default GoogleAuthCallback; 