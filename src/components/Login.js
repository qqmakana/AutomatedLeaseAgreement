import React, { useState } from 'react';
import { LogIn, Eye, EyeOff, Lock, User, UserPlus, ArrowLeft, Mail, Building, CheckCircle } from 'lucide-react';
import { logActivity, ACTIVITY_TYPES } from '../utils/activityLogger';

const Login = ({ onLogin }) => {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 800));

    let users = [];
    const storedUsers = localStorage.getItem('systemUsers');
    if (storedUsers) {
      try {
        users = JSON.parse(storedUsers);
      } catch (e) {
        users = [];
      }
    }
    
    if (users.length === 0) {
      users = [
        { id: 1, username: 'admin', name: 'Admin', role: 'Admin', password: 'q', status: 'active' },
        { id: 2, username: 'builder', name: 'Builder', role: 'Admin', password: 'q', status: 'active' },
        { id: 3, username: 'yehuda', name: 'Yehuda', role: 'Client', password: 'yehuda', status: 'active' }
      ];
      localStorage.setItem('systemUsers', JSON.stringify(users));
    }

    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user) {
      setError('Invalid username or password');
      setIsLoading(false);
      return;
    }

    if (user.status === 'pending') {
      setError('Your account is pending approval. Please contact the administrator.');
      setIsLoading(false);
      return;
    }

    if (user.status === 'disabled') {
      setError('Your account has been disabled. Please contact the administrator.');
      setIsLoading(false);
      return;
    }

    if (user.password === password) {
      const userData = {
        username: user.username,
        name: user.name,
        role: user.role,
        loginTime: new Date().toISOString()
      };
      localStorage.setItem('authUser', JSON.stringify(userData));
      
      // Log login activity
      logActivity(ACTIVITY_TYPES.LOGIN, {}, userData);
      
      onLogin(userData);
    } else {
      setError('Invalid username or password');
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 800));

    // Validation
    if (!username.trim() || !password.trim() || !name.trim()) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      setIsLoading(false);
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      setIsLoading(false);
      return;
    }

    // Check if username exists
    let users = [];
    const storedUsers = localStorage.getItem('systemUsers');
    if (storedUsers) {
      try {
        users = JSON.parse(storedUsers);
      } catch (e) {
        users = [];
      }
    }

    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      setError('Username already exists. Please choose another.');
      setIsLoading(false);
      return;
    }

    // Create new user with pending status
    const newUser = {
      id: Date.now(),
      username: username.toLowerCase(),
      name: name,
      company: company || '',
      role: 'Client',
      password: password, // Admin can see this
      status: 'pending', // Needs admin approval
      createdAt: new Date().toISOString(),
      requestedAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem('systemUsers', JSON.stringify(users));

    // Log account request activity
    logActivity(ACTIVITY_TYPES.REQUEST_ACCOUNT, { 
      requestedUsername: username,
      requestedName: name,
      company: company || 'N/A'
    }, { username: username, name: name, role: 'Pending' });

    // Try to send email notification to admin (non-blocking)
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      fetch(`${apiUrl}/api/notifications/new-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userDetails: {
            name: name,
            username: username.toLowerCase(),
            company: company || '',
            password: password // Admin can see in email
          },
          appUrl: window.location.origin
        })
      }).then(res => res.json())
        .then(data => console.log('Email notification result:', data))
        .catch(err => console.log('Email notification skipped:', err.message));
    } catch (e) {
      console.log('Email notification not sent');
    }

    setSuccess('Account request submitted! Please wait for administrator approval. The administrator has been notified.');
    setIsLoading(false);
    
    // Clear form
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setCompany('');
  };

  const switchToRegister = () => {
    setMode('register');
    setError('');
    setSuccess('');
  };

  const switchToLogin = () => {
    setMode('login');
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Card */}
      <div className="relative w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/80 rounded-3xl shadow-2xl border border-white/20 p-8 transform transition-all duration-300 hover:shadow-3xl">
          
          {mode === 'login' ? (
            <>
              {/* Login Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
                  <Lock className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
                <p className="text-gray-600">Sign in to Automated Lease Drafting System</p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-shake">
                    <strong>Error:</strong> {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Username</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white/50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                      placeholder="Enter your username"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-3 bg-white/50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>Sign In</span>
                    </>
                  )}
                </button>
              </form>

              {/* Register Link */}
              <div className="mt-6 text-center">
                <p className="text-gray-600 text-sm">
                  Don't have an account?{' '}
                  <button
                    onClick={switchToRegister}
                    className="text-blue-600 font-semibold hover:text-blue-700 hover:underline"
                  >
                    Request Access
                  </button>
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Register Header */}
              <div className="text-center mb-6">
                <button
                  onClick={switchToLogin}
                  className="absolute top-6 left-6 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mb-4 shadow-lg">
                  <UserPlus className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Request Account</h1>
                <p className="text-gray-600 text-sm">Fill in your details. Admin will approve your access.</p>
              </div>

              {/* Register Form */}
              <form onSubmit={handleRegister} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    <strong>Error:</strong> {error}
                  </div>
                )}
                
                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{success}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700">Full Name *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                      placeholder="Your full name"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700">Company/Organization</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                      placeholder="Your company (optional)"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700">Username *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                      placeholder="Choose a username"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700">Password *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-white/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                      placeholder="Create a password (min 4 chars)"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700">Confirm Password *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                      placeholder="Confirm your password"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || success}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-300 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      <span>Request Account</span>
                    </>
                  )}
                </button>
              </form>

              {/* Back to Login Link */}
              <div className="mt-4 text-center">
                <p className="text-gray-600 text-sm">
                  Already have an account?{' '}
                  <button
                    onClick={switchToLogin}
                    className="text-blue-600 font-semibold hover:text-blue-700 hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Floating Elements */}
        <div className="absolute -z-10 top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
          <div className="absolute bottom-10 right-10 w-2 h-2 bg-purple-400 rounded-full animate-ping animation-delay-1000"></div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s;
        }
      `}</style>
    </div>
  );
};

export default Login;
