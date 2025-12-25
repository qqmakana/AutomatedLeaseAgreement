// Runtime configuration for API URL
// This file is loaded before the React app starts
window.__RUNTIME_CONFIG__ = {
  REACT_APP_API_URL: window.location.hostname === 'localhost' 
    ? 'http://localhost:5001/api'
    : 'https://automatedleaseagreement.onrender.com/api'
};

