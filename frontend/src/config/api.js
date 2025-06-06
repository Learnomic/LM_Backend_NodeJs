const API_CONFIG = {
    BASE_URL: 'http://localhost:5000/api',
    ENDPOINTS: {
        GOOGLE_LOGIN: '/auth/google',
        PROFILE: '/auth/profile',
        GOOGLE_CALLBACK: '/auth/google/callback'
    }
};

export const getApiUrl = (endpoint) => {
    return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS[endpoint]}`;
};

export default API_CONFIG; 