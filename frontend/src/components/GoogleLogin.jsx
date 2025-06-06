import React from 'react';
import './GoogleLogin.css';

const GoogleLogin = () => {
    const handleGoogleLogin = () => {
        // Redirect to backend Google auth endpoint
        window.location.href = 'http://localhost:5000/api/auth/google';
    };

    return (
        <div className="google-login-container">
            <button 
                onClick={handleGoogleLogin}
                className="google-login-button"
            >
                <img 
                    src="https://www.google.com/favicon.ico" 
                    alt="Google" 
                    className="google-icon"
                />
                Sign in with Google
            </button>
        </div>
    );
};

export default GoogleLogin; 