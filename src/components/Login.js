import React, { useState } from 'react';
import { authAPI } from '../services/api';
import './Login.css';

const Login = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    organization: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const response = await authAPI.login(formData.email, formData.password);
        if (onLogin) {
          onLogin(response.user, response.token);
        }
      } else {
        // Register
        const response = await authAPI.register(formData);
        if (response.token) {
          // Auto-login after registration
          const loginResponse = await authAPI.login(formData.email, formData.password);
          if (onLogin) {
            onLogin(loginResponse.user, loginResponse.token);
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>{isLogin ? 'Login' : 'Register'}</h2>
        <p className="login-subtitle">
          {isLogin 
            ? 'Sign in to access your lease drafts' 
            : 'Create an account to start drafting leases'}
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required={!isLogin}
                />
              </div>
              <div className="form-group">
                <label htmlFor="organization">Organization (Optional)</label>
                <input
                  type="text"
                  id="organization"
                  name="organization"
                  value={formData.organization}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>

        <div className="login-switch">
          {isLogin ? (
            <>
              Don't have an account?{' '}
              <button type="button" onClick={() => setIsLogin(false)} className="link-button">
                Register here
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" onClick={() => setIsLogin(true)} className="link-button">
                Login here
              </button>
            </>
          )}
        </div>

        <div className="login-note">
          <small>
            💡 <strong>Note:</strong> For testing without database, the backend will show errors.
            Set up PostgreSQL to enable full functionality.
          </small>
        </div>
      </div>
    </div>
  );
};

export default Login;


















