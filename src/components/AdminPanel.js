import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Trash2, X, Shield, Eye, EyeOff, 
  Save, AlertCircle, CheckCircle, RefreshCw, UserCheck, UserX,
  Clock, Ban, Check, Activity, Filter, Download, ChevronDown,
  HelpCircle, MessageSquare, Calendar, Bell
} from 'lucide-react';
import { logActivity, getActivities, getUserActivities, getActivityDisplay, formatTimestamp, clearAllActivities, ACTIVITY_TYPES } from '../utils/activityLogger';

const AdminPanel = ({ isOpen, onClose, currentUser }) => {
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'activity', or 'help'
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [helpRequests, setHelpRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedUserActivity, setSelectedUserActivity] = useState(null); // For per-user activity view
  
  // Activity filters
  const [activityFilter, setActivityFilter] = useState('all'); // 'all', username, or activity type
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  
  // New user form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    role: 'Client'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load users, activities, and help requests from localStorage
  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadActivities();
      loadHelpRequests();
    }
  }, [isOpen]);

  const loadUsers = () => {
    setLoading(true);
    setError(null);
    
    const storedUsers = localStorage.getItem('systemUsers');
    if (storedUsers) {
      try {
        const parsed = JSON.parse(storedUsers);
        const updatedUsers = parsed.map(u => ({
          ...u,
          status: u.status || 'active'
        }));
        setUsers(updatedUsers);
      } catch (e) {
        initializeDefaultUsers();
      }
    } else {
      initializeDefaultUsers();
    }
    setLoading(false);
  };

  const loadActivities = () => {
    const allActivities = getActivities();
    setActivities(allActivities);
  };

  const loadHelpRequests = () => {
    const stored = localStorage.getItem('helpRequests');
    if (stored) {
      try {
        setHelpRequests(JSON.parse(stored));
      } catch (e) {
        setHelpRequests([]);
      }
    }
  };

  const handleResolveHelpRequest = (requestId) => {
    const updated = helpRequests.map(r => 
      r.id === requestId ? { ...r, status: 'resolved', resolvedAt: new Date().toISOString() } : r
    );
    localStorage.setItem('helpRequests', JSON.stringify(updated));
    setHelpRequests(updated);
    setSuccess('Help request marked as resolved');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDeleteHelpRequest = (requestId) => {
    const updated = helpRequests.filter(r => r.id !== requestId);
    localStorage.setItem('helpRequests', JSON.stringify(updated));
    setHelpRequests(updated);
  };

  const handleSetExpiration = (userId, days) => {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);
    
    const updatedUsers = users.map(u => 
      u.id === userId ? { ...u, expiresAt: expirationDate.toISOString() } : u
    );
    saveUsers(updatedUsers);
    
    const user = users.find(u => u.id === userId);
    logActivity(ACTIVITY_TYPES.SET_EXPIRATION || 'set_expiration', { 
      targetUser: user?.username,
      expiresIn: `${days} days`
    });
    loadActivities();
    
    setSuccess(`Account will expire in ${days} days`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleRemoveExpiration = (userId) => {
    const updatedUsers = users.map(u => 
      u.id === userId ? { ...u, expiresAt: null } : u
    );
    saveUsers(updatedUsers);
    setSuccess('Expiration removed - account is now permanent');
    setTimeout(() => setSuccess(null), 3000);
  };

  const isExpired = (user) => {
    if (!user.expiresAt) return false;
    return new Date(user.expiresAt) < new Date();
  };

  const getExpirationStatus = (user) => {
    if (!user.expiresAt) return null;
    const expDate = new Date(user.expiresAt);
    const now = new Date();
    const daysLeft = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return { text: 'Expired', color: 'text-red-600 bg-red-100' };
    if (daysLeft <= 7) return { text: `${daysLeft}d left`, color: 'text-amber-600 bg-amber-100' };
    return { text: `${daysLeft}d left`, color: 'text-green-600 bg-green-100' };
  };

  // Count pending help requests
  const pendingHelpRequests = helpRequests.filter(r => r.status === 'pending');

  const initializeDefaultUsers = () => {
    const defaultUsers = [
      { id: 1, username: 'admin', name: 'Admin', role: 'Admin', password: 'q', status: 'active', createdAt: new Date().toISOString() },
      { id: 2, username: 'builder', name: 'Builder', role: 'Admin', password: 'q', status: 'active', createdAt: new Date().toISOString() },
      { id: 3, username: 'yehuda', name: 'Yehuda', role: 'Client', password: 'yehuda', status: 'active', createdAt: new Date().toISOString() }
    ];
    setUsers(defaultUsers);
    localStorage.setItem('systemUsers', JSON.stringify(defaultUsers));
  };

  const saveUsers = (updatedUsers) => {
    localStorage.setItem('systemUsers', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
  };

  // Get pending and active users
  const pendingUsers = users.filter(u => u.status === 'pending');
  const activeUsers = users.filter(u => u.status === 'active');
  const disabledUsers = users.filter(u => u.status === 'disabled');

  const handleApproveUser = (userId) => {
    const user = users.find(u => u.id === userId);
    const updatedUsers = users.map(u => 
      u.id === userId ? { ...u, status: 'active', approvedAt: new Date().toISOString() } : u
    );
    saveUsers(updatedUsers);
    
    // Log activity
    logActivity(ACTIVITY_TYPES.APPROVE_USER, { 
      approvedUser: user?.username,
      approvedName: user?.name
    });
    loadActivities();
    
    setSuccess('User approved successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleRejectUser = (userId, username) => {
    if (window.confirm(`Reject and delete user request "${username}"?`)) {
      const updatedUsers = users.filter(u => u.id !== userId);
      saveUsers(updatedUsers);
      
      // Log activity
      logActivity(ACTIVITY_TYPES.REJECT_USER, { rejectedUser: username });
      loadActivities();
      
      setSuccess('User request rejected');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleToggleUserStatus = (userId, currentStatus) => {
    const user = users.find(u => u.id === userId);
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    const updatedUsers = users.map(u => 
      u.id === userId ? { ...u, status: newStatus } : u
    );
    saveUsers(updatedUsers);
    
    // Log activity
    logActivity(newStatus === 'active' ? ACTIVITY_TYPES.ENABLE_USER : ACTIVITY_TYPES.DISABLE_USER, { 
      targetUser: user?.username,
      targetName: user?.name
    });
    loadActivities();
    
    setSuccess(`User ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully!`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleAddUser = () => {
    setError(null);
    setSuccess(null);
    
    if (!newUser.username.trim()) {
      setError('Username is required');
      return;
    }
    if (!newUser.password.trim()) {
      setError('Password is required');
      return;
    }
    
    if (users.find(u => u.username.toLowerCase() === newUser.username.toLowerCase())) {
      setError('Username already exists');
      return;
    }

    setSaving(true);
    
    setTimeout(() => {
      const user = {
        id: Date.now(),
        username: newUser.username.toLowerCase(),
        name: newUser.name || newUser.username,
        role: newUser.role,
        password: newUser.password,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      
      const updatedUsers = [...users, user];
      saveUsers(updatedUsers);
      
      // Log activity
      logActivity(ACTIVITY_TYPES.CREATE_USER, { 
        createdUser: user.username,
        createdName: user.name,
        createdRole: user.role
      });
      loadActivities();
      
      setNewUser({ username: '', password: '', name: '', role: 'Client' });
      setShowAddForm(false);
      setSuccess(`User "${user.username}" created successfully!`);
      setSaving(false);
      
      setTimeout(() => setSuccess(null), 3000);
    }, 500);
  };

  const handleDeleteUser = (userId, username) => {
    if (currentUser && currentUser.username.toLowerCase() === username.toLowerCase()) {
      setError("You cannot delete your own account");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (window.confirm(`Are you sure you want to permanently delete user "${username}"?`)) {
      const updatedUsers = users.filter(u => u.id !== userId);
      saveUsers(updatedUsers);
      
      // Log activity
      logActivity(ACTIVITY_TYPES.DELETE_USER, { deletedUser: username });
      loadActivities();
      
      setSuccess(`User "${username}" deleted successfully!`);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleClearActivities = () => {
    if (window.confirm('Are you sure you want to clear all activity logs? This cannot be undone.')) {
      clearAllActivities();
      loadActivities();
      setSuccess('Activity log cleared');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const exportActivities = () => {
    const dataStr = JSON.stringify(activities, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileName = `activity-log-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
  };

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    if (activityFilter === 'all') return true;
    if (activityFilter.startsWith('user:')) {
      return activity.user?.username === activityFilter.replace('user:', '');
    }
    if (activityFilter.startsWith('type:')) {
      return activity.type === activityFilter.replace('type:', '');
    }
    return true;
  });

  // Get unique users from activities for filter
  const uniqueUsers = [...new Set(activities.map(a => a.user?.username).filter(Boolean))];

  if (!isOpen) return null;

  // Check if current user is admin
  if (!currentUser || currentUser.role !== 'Admin') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md">
          <div className="text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">Only administrators can access user management.</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Admin Panel</h2>
              <p className="text-indigo-200 text-sm">Manage users & view activity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-3 font-medium transition-colors text-sm sm:text-base ${
              activeTab === 'users' 
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Users</span>
            {pendingUsers.length > 0 && (
              <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                {pendingUsers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('activity'); loadActivities(); }}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-3 font-medium transition-colors text-sm sm:text-base ${
              activeTab === 'activity' 
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Activity</span>
            <span className="bg-gray-300 text-gray-700 text-xs px-1.5 py-0.5 rounded-full">
              {activities.length}
            </span>
          </button>
          <button
            onClick={() => { setActiveTab('help'); loadHelpRequests(); }}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-3 font-medium transition-colors text-sm sm:text-base ${
              activeTab === 'help' 
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Help</span>
            {pendingHelpRequests.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                {pendingHelpRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {/* Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <>
              {/* Pending Approvals Section - MOBILE OPTIMIZED */}
              {pendingUsers.length > 0 && (
                <div className="mb-6 p-3 sm:p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-300">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <h3 className="font-bold text-amber-800">🔔 Pending Approvals ({pendingUsers.length})</h3>
                  </div>
                  <div className="space-y-3">
                    {pendingUsers.map(user => (
                      <div key={user.id} className="bg-white p-3 sm:p-4 rounded-lg border-2 border-amber-300 shadow-md">
                        {/* User Info */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 sm:w-10 sm:h-10 bg-amber-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {user.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-lg sm:text-base truncate">{user.name}</p>
                            <p className="text-sm text-gray-600 truncate">@{user.username}</p>
                            {user.company && <p className="text-xs text-gray-500 truncate">🏢 {user.company}</p>}
                          </div>
                        </div>
                        {/* Password visible */}
                        <div className="mb-3 p-2 bg-gray-100 rounded-lg">
                          <p className="text-xs text-gray-600">Password: <code className="bg-white px-2 py-0.5 rounded font-bold text-gray-800">{user.password}</code></p>
                        </div>
                        {/* Action Buttons - Large & Touch-Friendly */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveUser(user.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 active:bg-green-700 transition-colors font-bold text-base shadow-lg"
                          >
                            <UserCheck className="w-5 h-5" />
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleRejectUser(user.id, user.username)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 active:bg-red-700 transition-colors font-bold text-base shadow-lg"
                          >
                            <UserX className="w-5 h-5" />
                            ✗ Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-600" />
                    <span className="font-semibold text-gray-700">{activeUsers.length} Active</span>
                  </div>
                  {disabledUsers.length > 0 && (
                    <span className="text-sm text-gray-500">• {disabledUsers.length} Disabled</span>
                  )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={loadUsers}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-md"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add User
                  </button>
                </div>
              </div>

              {/* Add User Form */}
              {showAddForm && (
                <div className="mb-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                    Create New User (Active Immediately)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Username *</label>
                      <input
                        type="text"
                        value={newUser.username}
                        onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                        placeholder="Enter username"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Display Name</label>
                      <input
                        type="text"
                        value={newUser.name}
                        onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                        placeholder="Enter display name"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Password *</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={newUser.password}
                          onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                          placeholder="Enter password"
                          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Client">Client</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleAddUser}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 transition-all"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Create User
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setNewUser({ username: '', password: '', name: '', role: 'Client' });
                        setError(null);
                      }}
                      className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Users Table */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading users...</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">User</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Role</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Password</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Expires</th>
                        <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...activeUsers, ...disabledUsers].map((user) => (
                        <tr 
                          key={user.id} 
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            currentUser && currentUser.username.toLowerCase() === user.username.toLowerCase() 
                              ? 'bg-blue-50' 
                              : user.status === 'disabled' ? 'bg-gray-50 opacity-60' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                user.role === 'Admin' ? 'bg-purple-500' : 'bg-blue-500'
                              } ${user.status === 'disabled' ? 'opacity-50' : ''}`}>
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className={`font-medium text-gray-900 ${user.status === 'disabled' ? 'line-through' : ''}`}>
                                  {user.name || user.username}
                                </span>
                                <p className="text-xs text-gray-500">@{user.username}</p>
                              </div>
                              {currentUser && currentUser.username.toLowerCase() === user.username.toLowerCase() && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">You</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              user.role === 'Admin' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono">
                              {user.password}
                            </code>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              user.status === 'active' 
                                ? isExpired(user) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {user.status === 'active' 
                                ? isExpired(user) ? '⏰ Expired' : '✓ Active' 
                                : '✗ Disabled'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {getExpirationStatus(user) ? (
                              <div className="flex items-center gap-1">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getExpirationStatus(user).color}`}>
                                  {getExpirationStatus(user).text}
                                </span>
                                <button
                                  onClick={() => handleRemoveExpiration(user.id)}
                                  className="text-gray-400 hover:text-gray-600 text-xs"
                                  title="Remove expiration"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="relative group">
                                <button className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Set
                                </button>
                                <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-lg border border-gray-200 z-10 hidden group-hover:block">
                                  <button onClick={() => handleSetExpiration(user.id, 7)} className="block w-full text-left px-3 py-1.5 hover:bg-gray-50 text-xs">7 days</button>
                                  <button onClick={() => handleSetExpiration(user.id, 30)} className="block w-full text-left px-3 py-1.5 hover:bg-gray-50 text-xs">30 days</button>
                                  <button onClick={() => handleSetExpiration(user.id, 90)} className="block w-full text-left px-3 py-1.5 hover:bg-gray-50 text-xs">90 days</button>
                                  <button onClick={() => handleSetExpiration(user.id, 365)} className="block w-full text-left px-3 py-1.5 hover:bg-gray-50 text-xs">1 year</button>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* View Activity */}
                              <button
                                onClick={() => { setActiveTab('activity'); setActivityFilter(`user:${user.username}`); }}
                                className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="View user activity"
                              >
                                <Activity className="w-4 h-4" />
                              </button>
                              {!(currentUser && currentUser.username.toLowerCase() === user.username.toLowerCase()) && (
                                <button
                                  onClick={() => handleToggleUserStatus(user.id, user.status)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    user.status === 'active'
                                      ? 'text-amber-500 hover:bg-amber-50'
                                      : 'text-green-500 hover:bg-green-50'
                                  }`}
                                  title={user.status === 'active' ? 'Disable user' : 'Enable user'}
                                >
                                  {user.status === 'active' ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteUser(user.id, user.username)}
                                disabled={currentUser && currentUser.username.toLowerCase() === user.username.toLowerCase()}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title={currentUser && currentUser.username.toLowerCase() === user.username.toLowerCase() ? "Can't delete yourself" : "Delete user"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Info */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm text-blue-800">
                  <strong>💡 How it works:</strong>
                </p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Users can request accounts from the login page</li>
                  <li>You approve or reject their requests here</li>
                  <li>You can see all passwords and share them if users forget</li>
                  <li>Disable accounts temporarily without deleting them</li>
                  <li>Only Admins can access this panel</li>
                </ul>
              </div>
            </>
          )}

          {/* ACTIVITY LOG TAB */}
          {activeTab === 'activity' && (
            <>
              {/* Activity Actions Bar */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-gray-600" />
                  <span className="font-semibold text-gray-700">{filteredActivities.length} Activities</span>
                  
                  {/* Filter Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                      className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                    >
                      <Filter className="w-4 h-4" />
                      {activityFilter === 'all' ? 'All' : activityFilter.replace('user:', '@').replace('type:', '')}
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    
                    {showFilterDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10 max-h-64 overflow-y-auto">
                        <button
                          onClick={() => { setActivityFilter('all'); setShowFilterDropdown(false); }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 text-sm ${activityFilter === 'all' ? 'bg-blue-50 text-blue-700' : ''}`}
                        >
                          All Activities
                        </button>
                        
                        <div className="border-t border-gray-100 px-4 py-1 text-xs text-gray-500 bg-gray-50">By User</div>
                        {uniqueUsers.map(username => (
                          <button
                            key={username}
                            onClick={() => { setActivityFilter(`user:${username}`); setShowFilterDropdown(false); }}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-50 text-sm ${activityFilter === `user:${username}` ? 'bg-blue-50 text-blue-700' : ''}`}
                          >
                            @{username}
                          </button>
                        ))}
                        
                        <div className="border-t border-gray-100 px-4 py-1 text-xs text-gray-500 bg-gray-50">By Type</div>
                        {Object.values(ACTIVITY_TYPES).slice(0, 10).map(type => {
                          const display = getActivityDisplay(type);
                          return (
                            <button
                              key={type}
                              onClick={() => { setActivityFilter(`type:${type}`); setShowFilterDropdown(false); }}
                              className={`w-full text-left px-4 py-2 hover:bg-gray-50 text-sm ${activityFilter === `type:${type}` ? 'bg-blue-50 text-blue-700' : ''}`}
                            >
                              {display.icon} {display.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={loadActivities}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                  <button
                    onClick={exportActivities}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                  <button
                    onClick={handleClearActivities}
                    className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear
                  </button>
                </div>
              </div>

              {/* Activity List */}
              {filteredActivities.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No activities recorded yet</p>
                  <p className="text-sm text-gray-500 mt-1">Activities will appear here as users interact with the system</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredActivities.map((activity) => {
                    const display = getActivityDisplay(activity.type);
                    return (
                      <div 
                        key={activity.id}
                        className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <div className={`text-2xl`}>{display.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{display.label}</span>
                            {activity.details && Object.keys(activity.details).length > 0 && (
                              <span className="text-sm text-gray-500">
                                {Object.entries(activity.details)
                                  .filter(([k, v]) => v)
                                  .map(([k, v]) => `${v}`)
                                  .join(', ')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              activity.user?.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              @{activity.user?.username || 'unknown'}
                            </span>
                            <span className="text-xs text-gray-500">{formatTimestamp(activity.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Activity Info */}
              <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                <p className="text-sm text-purple-800">
                  <strong>📊 Activity Tracking:</strong>
                </p>
                <ul className="text-sm text-purple-700 mt-2 space-y-1 list-disc list-inside">
                  <li>All user actions are automatically logged</li>
                  <li>Track logins, document uploads, and generations</li>
                  <li>Monitor user management actions</li>
                  <li>Export logs for compliance records</li>
                  <li>Last 500 activities are stored</li>
                </ul>
              </div>
            </>
          )}

          {/* HELP REQUESTS TAB */}
          {activeTab === 'help' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-gray-600" />
                  <span className="font-semibold text-gray-700">{helpRequests.length} Help Requests</span>
                  {pendingHelpRequests.length > 0 && (
                    <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                      {pendingHelpRequests.length} pending
                    </span>
                  )}
                </div>
                <button
                  onClick={loadHelpRequests}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>

              {helpRequests.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No help requests yet</p>
                  <p className="text-sm text-gray-500 mt-1">When users need assistance, their requests will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {helpRequests.map((request) => (
                    <div 
                      key={request.id}
                      className={`p-4 rounded-xl border-2 ${
                        request.status === 'pending' 
                          ? 'bg-amber-50 border-amber-300' 
                          : 'bg-green-50 border-green-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                            request.status === 'pending' ? 'bg-amber-500' : 'bg-green-500'
                          }`}>
                            {request.status === 'pending' ? <Bell className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{request.userName || 'Unknown User'}</span>
                              <span className="text-sm text-gray-500">@{request.username}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                request.status === 'pending' 
                                  ? 'bg-amber-200 text-amber-800' 
                                  : 'bg-green-200 text-green-800'
                              }`}>
                                {request.status === 'pending' ? '⏳ Pending' : '✓ Resolved'}
                              </span>
                            </div>
                            <p className="text-gray-700 mt-1">{request.message}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              Submitted: {new Date(request.createdAt).toLocaleString()}
                              {request.resolvedAt && ` • Resolved: ${new Date(request.resolvedAt).toLocaleString()}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {request.status === 'pending' && (
                            <button
                              onClick={() => handleResolveHelpRequest(request.id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                            >
                              <Check className="w-4 h-4" />
                              Mark Resolved
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteHelpRequest(request.id)}
                            className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Help Info */}
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800">
                  <strong>🆘 Help System:</strong>
                </p>
                <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Users can click "Need Help?" button in the app to send you a request</li>
                  <li>You receive notifications when new requests come in</li>
                  <li>Mark requests as resolved once you've helped them</li>
                  <li>This keeps you essential - users depend on you for support!</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
